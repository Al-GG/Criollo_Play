# Volantines · Criollo Play 🪁

Primer juego de **Criollo Play**, plataforma de juegos tradicionales chilenos (trabajo universitario, 3 juegos). Juego 3D para elevar volantines y competir en una comisión, como en las Fiestas Patrias chilenas. Corre directo en el navegador, en PC y en celular.

**Jugar en línea:** https://al-gg.github.io/Criollo_Play/

## De qué se trata

Elevas tu volantín aprovechando el viento, que cambia cada 10 segundos. Primero hay que subirlo y después hay que defenderlo. Los rivales de la computadora también elevan el suyo y, cuando ya están arriba, uno o dos van a tu altura a atacarte. Si los hilos se cruzan quedan enredados: el que serrucha mejor (tira o da hilo) corta el hilo del otro.

## Controles

| Acción | PC | Celular |
|---|---|---|
| Tirar del hilo | `ESPACIO` o click | botón **Tirar** |
| Dirigir | `A` `D` o flechas | botones ◀ ▶ |
| Dar hilo | `S` o ↓ | botón **Dar hilo** |
| Reiniciar | `R` | ↻ |
| Cambiar escenario | `E` | 🗺 |
| Cambiar volantín | `V` | 🪁 |
| Jugar con amigos | `M` | 👥 |

Todos los controles responden con una rampa suave, así que el volantín nunca reacciona de golpe.

## Características

- **Física del volantín:** arrastre y sustentación calculados según el viento relativo. El hilo funciona como una restricción de largo.
- **Viento variable:** cinco tipos (calma, brisa, fuerte, ráfagas, lateral), más fuerte en altura. Lo muestran rayas blancas en el aire.
- **Cuatro volantines:** ñecla, volantín, chonchón y pavo. Cada uno tiene su forma, física, resistencia de hilo y fuerza de corte.
- **Rivales con personalidad:** rápido, pícaro y defensivo. Primero suben a 30-40 m y después atacan, máximo dos a la vez.
- **Seis escenarios chilenos:** campo, bosque, desierto, playa, ciudad y cerros. Sale uno al azar en cada partida.
- **Ambiente:** hora del día al azar (mañana, mediodía o atardecer), banderas chilenas que flamean con el viento, bandadas de pájaros y un barco en el horizonte cuando hay mar.
- **Multijugador:** un jugador crea una sala (código `VOLA-1234`) y los demás se unen. La conexión va directo entre navegadores (WebRTC con PeerJS) y no necesita servidor propio.
- **Funciona sin internet** (salvo el multijugador) y se abre con doble click, sin instalar nada.

## Tecnologías

- [three.js](https://threejs.org) r160 para el 3D, con una copia local en `js/lib/`.
- [PeerJS](https://peerjs.com) para el multijugador. Se carga solo al usarlo.
- JavaScript puro, sin frameworks, sin compilación y sin npm.

## Estructura del código

```
index.html        HUD, botones y cargador de scripts
img/volantin.svg  ícono y logo (volantín dieciochero)
css/estilos.css   estilos
js/
  lib/three.js    three.js (copia local)
  base.js         atajos comunes
  rivales.js      personalidades e inteligencia de los rivales
  escenarios.js   render, escenarios, cielo, terreno y ambiente
  personaje.js    personaje articulado y su animación
  volantin.js     tipos de volantín, forma y física
  estado.js       estado compartido; crea al jugador y a los rivales
  viento.js       tipos de viento y su cambio en el tiempo
  controles.js    teclado, mouse, botones táctiles y selector
  comision.js     cruce de hilos, corte, colas e hilo
  red.js          multijugador
  main.js         dibujo de cada cuadro y ciclo principal
```

Los archivos son scripts clásicos que comparten variables y se cargan en ese orden. Por eso el juego funciona abriendo `index.html` directamente, sin servidor.

## Cómo ejecutarlo

- **PC:** descarga el repositorio y abre `index.html` con doble click.
- **Celular:** entra al enlace de GitHub Pages. También puedes correr `python -m http.server 8000` en la carpeta y abrir `http://IP-DEL-PC:8000` desde el celular.

## Créditos

Desarrollado con apoyo de Claude Code (asistente de programación con IA). El archivo `CLAUDE.md` tiene las instrucciones del proyecto que usa ese asistente.
