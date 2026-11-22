# Sugestões de design (para decisão do time)

Regra do projeto: **o HTML/Figma vence**. Aqui ficam os pontos em que a implementação precisou
divergir das telas (acessibilidade/responsivo) ou em que a Impeccable sugeriu algo — para vocês decidirem.

| # | Onde | O que as telas fazem | O que foi feito / sugerido | Motivo | Status |
|---|---|---|---|---|---|
| 1 | Texto laranja (timeline "atual", badge "Preparando", limite do NutriBot) | `#F4A261` como cor de texto sobre branco | Texto em `#A8571C`; fundos e ícones continuam `#F4A261` | Contraste 2,2:1 reprova AA (mínimo 4,5:1) | Aplicado — confirmar |
| 2 | Sidebar dos painéis em tablet/celular | `display: none` abaixo de 1023px (some sem alternativa) | Vira drawer com botão de menu | Requisito do prompt (seção 9) | Aplicado |
| 3 | Textos cinza `#8A958A` em 11–12px | Usado em descrições pequenas | Descrições pequenas usam `#4A5A4A`; `#8A958A` fica para rótulos uppercase e placeholders | `#8A958A` sobre branco = 3,0:1 | Aplicado parcialmente — revisar na Fase 5 |
| 4 | Eyebrow (traço + texto uppercase acima do título, ex. login) | Presente nas telas de autenticação | Mantido | A Impeccable desaconselha "eyebrow" acima de títulos, mas as telas mandam | Mantido (decisão do time) |
| 5 | Navbar do cliente | Item "Restaurantes" só aparece na tela 13 | Navbar com os 5 itens comuns; "Restaurantes" no menu mobile e via marketplace | Consistência entre telas | Confirmar |
| 6 | Largura | `body { width: 1440px }` fixo em todas as telas | Layout fluido com máximo de 1440px | Responsividade | Aplicado |
| 7 | Anual "-20%" (tela 09) × "30%" (prompt) | Tela mostra -20% | Seguimos a tela 09 (confirmado pelo usuário) | — | Decidido |
