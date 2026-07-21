# Atualização anatômica EmyFit v2.3

Esta atualização adiciona as ilustrações anatômicas aprovadas para:
- Leg press 45°
- Remada sentada/articulada

Os demais exercícios continuam usando as ilustrações anteriores nesta etapa.

## Arquivos que serão substituídos
- app.js
- styles.css
- service-worker.js

## Arquivos novos
- assets/exercises/legpress-anatomico.webp
- assets/exercises/remada-sentada-anatomica.webp

## Importante
Não substitua nem apague o arquivo config.js. Ele contém a conexão do Supabase.

## Atualização pelo GitHub
1. Extraia o ZIP.
2. No repositório, clique em Add file > Upload files.
3. Arraste app.js, styles.css e service-worker.js.
4. Abra a pasta assets/exercises no GitHub e envie os dois arquivos .webp para essa pasta.
5. Faça o commit com o nome: Atualização anatômica v2.3.
6. Aguarde o GitHub Actions finalizar com sinal verde.
7. Abra o site no Chrome antes de abrir o app instalado.
8. Atualize a página e confirme as imagens.
9. Se o PWA continuar antigo, desinstale-o, limpe os dados do site github.io e instale novamente.

## Estrutura final
assets/
  exercises/
    legpress-anatomico.webp
    remada-sentada-anatomica.webp
app.js
styles.css
service-worker.js
config.js  (mantenha o seu atual)
