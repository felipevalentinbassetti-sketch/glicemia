// Base de alimentos para estimar carboidratos.
// Valores APROXIMADOS por porção caseira, baseados na Tabela Brasileira de Composição
// de Alimentos (TACO/NEPA-Unicamp) e em rótulos comuns. Sempre que houver rótulo, prefira ele.

export type Food = {
  name: string;
  portion: string;
  carbs: number; // gramas de carboidrato por porção
};

export const FOODS: Food[] = [
  // Cereais, pães e massas
  { name: "Arroz branco cozido", portion: "1 colher de servir (45 g)", carbs: 12.6 },
  { name: "Arroz integral cozido", portion: "1 colher de servir (45 g)", carbs: 11.6 },
  { name: "Macarrão cozido", portion: "1 escumadeira (55 g)", carbs: 15.5 },
  { name: "Pão francês", portion: "1 unidade (50 g)", carbs: 29.3 },
  { name: "Pão de forma", portion: "1 fatia (25 g)", carbs: 11.0 },
  { name: "Pão de forma integral", portion: "1 fatia (25 g)", carbs: 10.0 },
  { name: "Pão de queijo", portion: "1 unidade média (20 g)", carbs: 6.8 },
  { name: "Tapioca (goma)", portion: "2 colheres de sopa (30 g)", carbs: 16.0 },
  { name: "Cuscuz de milho cozido", portion: "1 fatia (100 g)", carbs: 25.3 },
  { name: "Aveia em flocos", portion: "2 colheres de sopa (30 g)", carbs: 20.0 },
  { name: "Granola", portion: "2 colheres de sopa (30 g)", carbs: 20.0 },
  { name: "Biscoito cream cracker", portion: "3 unidades (20 g)", carbs: 13.7 },
  { name: "Biscoito recheado", portion: "3 unidades (35 g)", carbs: 24.0 },
  { name: "Bolo simples", portion: "1 fatia (60 g)", carbs: 32.0 },
  { name: "Pizza de mussarela", portion: "1 fatia (100 g)", carbs: 30.0 },
  { name: "Farofa", portion: "1 colher de sopa (15 g)", carbs: 11.0 },
  // Leguminosas
  { name: "Feijão carioca cozido", portion: "1 concha (86 g)", carbs: 11.7 },
  { name: "Feijão preto cozido", portion: "1 concha (86 g)", carbs: 12.3 },
  { name: "Lentilha cozida", portion: "1 concha (86 g)", carbs: 14.0 },
  { name: "Grão-de-bico cozido", portion: "1 concha (86 g)", carbs: 17.0 },
  // Tubérculos e vegetais
  { name: "Batata inglesa cozida", portion: "1 unidade média (130 g)", carbs: 15.5 },
  { name: "Batata frita", portion: "1 porção pequena (100 g)", carbs: 35.0 },
  { name: "Batata-doce cozida", portion: "1 fatia grande (100 g)", carbs: 18.4 },
  { name: "Mandioca cozida", portion: "1 pedaço (100 g)", carbs: 30.1 },
  { name: "Milho verde", portion: "2 colheres de sopa (40 g)", carbs: 6.8 },
  { name: "Cenoura crua", portion: "1 unidade média (100 g)", carbs: 7.7 },
  { name: "Beterraba crua", portion: "1 unidade pequena (100 g)", carbs: 11.1 },
  // Frutas
  { name: "Banana prata", portion: "1 unidade (55 g)", carbs: 14.3 },
  { name: "Maçã", portion: "1 unidade média (130 g)", carbs: 19.8 },
  { name: "Laranja pera", portion: "1 unidade (140 g)", carbs: 12.5 },
  { name: "Mamão papaia", portion: "1/2 unidade (140 g)", carbs: 14.6 },
  { name: "Manga", portion: "1 unidade pequena (140 g)", carbs: 22.0 },
  { name: "Melancia", portion: "1 fatia (200 g)", carbs: 16.2 },
  { name: "Uva", portion: "1 cacho pequeno (100 g)", carbs: 13.6 },
  { name: "Abacaxi", portion: "1 fatia (75 g)", carbs: 9.3 },
  { name: "Morango", portion: "10 unidades (120 g)", carbs: 8.2 },
  // Bebidas e laticínios
  { name: "Leite integral", portion: "1 copo (200 ml)", carbs: 9.8 },
  { name: "Iogurte natural", portion: "1 pote (170 g)", carbs: 9.0 },
  { name: "Iogurte com frutas (adoçado)", portion: "1 pote (170 g)", carbs: 24.0 },
  { name: "Suco de laranja natural", portion: "1 copo (200 ml)", carbs: 16.4 },
  { name: "Refrigerante comum", portion: "1 lata (350 ml)", carbs: 37.0 },
  { name: "Açaí na tigela (com xarope)", portion: "1 tigela (300 g)", carbs: 75.0 },
  // Doces e açúcares
  { name: "Açúcar", portion: "1 colher de chá (5 g)", carbs: 5.0 },
  { name: "Mel", portion: "1 colher de sopa (15 g)", carbs: 12.6 },
  { name: "Chocolate ao leite", portion: "1 barra pequena (25 g)", carbs: 15.0 },
  { name: "Sorvete de massa", portion: "1 bola (60 g)", carbs: 15.0 },
  { name: "Brigadeiro", portion: "1 unidade (20 g)", carbs: 12.0 },
  { name: "Tablete de glicose (correção de hipo)", portion: "1 tablete (4 g)", carbs: 4.0 },
];
