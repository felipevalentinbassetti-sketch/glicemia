import { createHash } from "node:crypto";

// Cliente da API do LibreLinkUp (não oficial, a mesma usada pelo app de seguidores da Abbott).
// Referência: github.com/timoschlueter/nightscout-librelink-up

const REGION_HOSTS: Record<string, string> = {
  ae: "api-ae.libreview.io",
  ap: "api-ap.libreview.io",
  au: "api-au.libreview.io",
  ca: "api-ca.libreview.io",
  de: "api-de.libreview.io",
  eu: "api-eu.libreview.io",
  eu2: "api-eu2.libreview.io",
  fr: "api-fr.libreview.io",
  jp: "api-jp.libreview.io",
  la: "api-la.libreview.io",
  us: "api-us.libreview.io",
  ru: "api.libreview.ru",
  cn: "api-cn.myfreestyle.cn",
};

const DEFAULT_HOST = "api.libreview.io";

// A Abbott recusa versões antigas do app; pode ser atualizada sem mexer no código
const APP_VERSION = process.env.LIBRE_LINK_UP_VERSION ?? "4.16.0";

export class LibreError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "LibreError";
  }
}

export type LibreSession = {
  host: string;
  token: string;
  expiresAt: Date;
  accountIdHash: string;
};

export type LibreReading = {
  measuredAt: Date;
  valueMgdl: number;
  // 1 = caindo rápido … 5 = subindo rápido
  trend: number | null;
};

type GlucoseItem = {
  FactoryTimestamp: string;
  ValueInMgPerDl: number;
  TrendArrow?: number;
};

type LoginResponse = {
  status: number;
  data?: {
    redirect?: boolean;
    region?: string;
    user?: { id: string };
    authTicket?: { token: string; expires: number };
  };
};

type ConnectionsResponse = {
  status: number;
  data?: { patientId: string }[];
};

type GraphResponse = {
  status: number;
  data?: {
    connection?: { glucoseMeasurement?: GlucoseItem };
    graphData?: GlucoseItem[];
  };
};

function buildHeaders(session?: LibreSession): HeadersInit {
  return {
    "content-type": "application/json",
    accept: "application/json",
    "cache-control": "no-cache",
    product: "llu.android",
    version: APP_VERSION,
    ...(session && {
      authorization: `Bearer ${session.token}`,
      "account-id": session.accountIdHash,
    }),
  };
}

async function request<T>(
  host: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(`https://${host}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const hint =
      res.status === 401
        ? "sessão expirada"
        : res.status === 403
          ? "acesso negado (versão do app recusada?)"
          : res.status === 429 || res.status === 430
            ? "muitas requisições, tente mais tarde"
            : "erro no servidor do LibreLinkUp";
    throw new LibreError(`HTTP ${res.status} em ${path}: ${hint}`, res.status);
  }

  return res.json() as Promise<T>;
}

export async function login(
  email: string,
  password: string,
): Promise<LibreSession> {
  let host = DEFAULT_HOST;

  // A primeira tentativa pode responder apenas com a região correta da conta
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = await request<LoginResponse>(host, "/llu/auth/login", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (body.data?.redirect && body.data.region) {
      const regionHost = REGION_HOSTS[body.data.region.toLowerCase()];
      if (!regionHost) {
        throw new LibreError(`Região desconhecida: ${body.data.region}`);
      }
      host = regionHost;
      continue;
    }

    if (body.status === 2) {
      throw new LibreError("E-mail ou senha do LibreLinkUp incorretos");
    }
    if (body.status === 4) {
      throw new LibreError(
        "O LibreLinkUp pede uma ação na conta (ex.: aceitar novos termos). Entre uma vez no app LibreLinkUp do celular.",
      );
    }
    if (body.status !== 0 || !body.data?.authTicket || !body.data.user) {
      throw new LibreError(`Login recusado pelo LibreLinkUp (status ${body.status})`);
    }

    return {
      host,
      token: body.data.authTicket.token,
      expiresAt: new Date(body.data.authTicket.expires * 1000),
      accountIdHash: createHash("sha256")
        .update(body.data.user.id)
        .digest("hex"),
    };
  }

  throw new LibreError("O LibreLinkUp redirecionou a região mais de uma vez");
}

// Busca as leituras das últimas ~12h da primeira conexão (o próprio usuário)
export async function fetchReadings(
  session: LibreSession,
): Promise<LibreReading[]> {
  const headers = buildHeaders(session);

  const connections = await request<ConnectionsResponse>(
    session.host,
    "/llu/connections",
    { headers },
  );
  const patientId = connections.data?.[0]?.patientId;
  if (!patientId) {
    throw new LibreError(
      "Nenhuma conexão no LibreLinkUp. No app LibreLink, convide a conta do LibreLinkUp para seguir você.",
    );
  }

  const graph = await request<GraphResponse>(
    session.host,
    `/llu/connections/${patientId}/graph`,
    { headers },
  );

  const items = [...(graph.data?.graphData ?? [])];
  const current = graph.data?.connection?.glucoseMeasurement;
  if (current) items.push(current);

  const byTime = new Map<number, LibreReading>();
  for (const item of items) {
    const reading = toReading(item);
    // A leitura atual vem por último e tem a seta de tendência, então sobrescreve
    if (reading) byTime.set(reading.measuredAt.getTime(), reading);
  }

  return [...byTime.values()].sort(
    (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime(),
  );
}

function toReading(item: GlucoseItem): LibreReading | null {
  const measuredAt = parseFactoryTimestamp(item.FactoryTimestamp);
  const value = Math.round(item.ValueInMgPerDl);
  if (!measuredAt || !Number.isFinite(value) || value < 20 || value > 600) {
    return null;
  }

  const trend =
    item.TrendArrow && item.TrendArrow >= 1 && item.TrendArrow <= 5
      ? item.TrendArrow
      : null;

  return { measuredAt, valueMgdl: value, trend };
}

// FactoryTimestamp vem em UTC no formato "10/20/2026 1:23:45 PM"
export function parseFactoryTimestamp(value: string): Date | null {
  const match =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/.exec(
      value?.trim() ?? "",
    );
  if (!match) return null;

  const [, month, day, year, hour, minute, second, period] = match;
  let h = Number(hour) % 12;
  if (period === "PM") h += 12;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      h,
      Number(minute),
      Number(second),
    ),
  );
}
