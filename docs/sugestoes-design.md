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
| 8 | Aceite dos termos (tela 03) | Checkbox já vem marcado | Começa **desmarcado**; sem o aceite o cadastro não avança | LGPD exige consentimento explícito | Aplicado — confirmar |
| 9 | Botão Apple (tela 03) | Google, Facebook e Apple | Só Google e Facebook | Login com Apple removido do escopo (decisão de 22/11) | Aplicado |
| 10 | Depoimento e "Mais de 500 pessoas" (telas 02/03) | Texto de marketing com cliente "Camila R." | Mantido como está na tela | A Impeccable desaconselha depoimento/número sem fonte real; o time decide se mantém na apresentação | Mantido (decisão do time) |
| 11 | Números da landing (tela 01) | "500+ usuários", "120 restaurantes", "45 nutricionistas", "12k+ avaliações" | Calculados no banco (`GET /api/vitrine`); com o seed, aparecem 17 clientes, 6 restaurantes, 1 nutricionista e 2,1k avaliações | Regra "nada fixo no componente"; números reais na demo | Aplicado — decidir se o seed deve crescer para números mais próximos da tela |
| 12 | Links do rodapé da landing | Redes sociais (f/in/ig/tw), Blog, Carreira | Redes e Blog removidos (não há perfis oficiais nem blog); Carreira, Contato e Central de ajuda abrem o Fale conosco | Nenhum botão sem ação | Aplicado — confirmar |
| 13 | Distância nos cards (telas 11, 12) | "Sabor Natural · 1.2km" | Mostra o tempo de entrega do restaurante ("25–35 min") | Não temos a localização do cliente (mapas são placeholder); o tempo vem do banco | Aplicado — confirmar |
| 14 | Galeria da tela 12 | 4 miniaturas | Só a foto principal | Cada prato tem uma foto no banco; miniaturas repetidas confundiriam | Aplicado — confirmar |
| 15 | Selo "Pescetariano" (tela 11) | Pílula de categoria | Filtra pratos com peixe ou compatíveis com vegetariano | Não existe restrição "pescetariano" no cadastro (tela 05) | Aplicado |

## Tela 25 — NutriBot (23/11)
- **Botão de anexo (clipe)** removido: o NutriBot não analisa foto de comida (fora do escopo, ver CLAUDE.md). Mantê-lo seria um botão sem ação.
- **Botão de configurações (engrenagem)** removido do topo do chat: não há configuração do bot no escopo. A lixeira apaga a conversa atual.
- **Microfone** só aparece quando o navegador suporta reconhecimento de voz (Chrome/Edge); transcreve em pt-BR para o campo.
