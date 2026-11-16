# Volantines

Juego 3D de elevar volantines hecho con three.js (cargado por CDN con importmap, sin build ni npm).

## Estructura
- `index.html`: HUD, botones y el cargador. Un módulo importa three.js, lo deja en `window.THREE` y carga los scripts de `js/` **en orden**.
- `js/*.js` son **scripts clásicos (no módulos)** que comparten variables globales; así el juego se abre con doble click, sin servidor. El orden de carga importa: un archivo solo puede usar al cargar lo definido en archivos anteriores (en tiempo de juego todo está disponible).
- Orden: `base` (atajos) → `rivales` (personalidades, grupo, IA) → `escenarios` (renderer, biomas, cielo, terreno, ambiente) → `personaje` → `volantin` (tipos, forma, física, giros) → `estado` (variables compartidas, crea jugador y rivales) → `viento` → `controles` (teclado/táctil, selector) → `comision` (cruce de hilos, cola, hilo) → `red` (multijugador) → `main` (dibujo por cuadro y ciclo `loop()`).
- `css/estilos.css`: estilos.
- No declarar globales con nombres reservados del navegador (`top`, `name`, `status`, etc.) ni repetir nombres entre archivos.

## Reglas
- Textos del juego y comentarios en español (chileno).
- Controles siempre suaves: toda entrada (tirar, dar hilo, dirigir) usa rampa gradual, nunca valores bruscos.
- Debe funcionar en PC (teclado/mouse) y celular (botones táctiles, solo visibles en pantallas táctiles).
- Mantener todo simple: sin frameworks. Dependencias por CDN: three.js y PeerJS (este último solo se carga al usar el multijugador).

## Mecánicas actuales
- Física del volantín: arrastre + sustentación según el viento relativo; el hilo es una restricción de largo.
- Viento cambia de tipo cada 10 s (`WIND_TYPES`) y es más fuerte en altura. Rayas blancas lo muestran.
- Personaje articulado; el hilo sale de su mano derecha.
- Ambiente: hora del día al azar (`TIMES`: mañana, mediodía, atardecer; `?hora=atardecer` la fuerza), banderas chilenas de Fiestas Patrias flameando con el viento (solo hacia adelante), bandadas de pájaros, y un barco en el horizonte en escenarios con mar.
- Escenarios (`BIOMES`): campo, bosque, desierto, playa, ciudad, cerros. Uno al azar por partida (sin repetir el anterior); `?escenario=playa` lo fuerza y la tecla E cambia. El área de juego (radio ~35 m alrededor de z=-15) siempre queda plana.
- Jugador y rivales comparten la misma física (`createFlyer` / `stepFlyer`); rivales con IA (`aiThink`). En cada partida salen 3 o 4 rivales al azar de `RIVAL_POOL`, en posiciones al azar cercanas (`RIVAL_SPOT`, separados al menos 4,5 m).
- Rivales: primero suben a 30-40 m y luego juegan según su personalidad (`STYLES`: rápido, pícaro, defensivo). Siempre elevan los 3; al azar 1 o 2 (máx. `MAX_ATTACKERS`) van a tu altura a atacarte.
- Tipos de volantín (`KITE_TYPES`): ñecla, volantín, chonchón, pavo; cada uno con su física, resistencia de hilo, fuerza de corte y forma. El jugador elige al empezar (tecla V o botón 🪁 para cambiar); los rivales reciben uno al azar. `PLAYER_CAN_PICK = false` desactiva el selector.
- Comisión: si dos hilos se cruzan quedan enredados; tirar o dar hilo "serrucha" y daña el hilo del otro hasta cortarlo.
- Multijugador (`js/red.js`, PeerJS): botón 👥 o tecla M. El anfitrión crea la sala (código VOLA-1234) y manda: viento, rivales IA y cortes. Cada invitado simula su propio volantín y envía su estado (~20/s); el anfitrión envía todo (~15/s). Unirse recarga la página con `?unirse=1234` (y `?escenario=...&hora=...` del anfitrión). Cada invitado toma el lugar de un rival IA. Los volantineros que llegan por la red tienen `f.remote = true` (no se simulan localmente).

## Probar
- PC: abrir `index.html` en el navegador (necesita internet por el CDN).
- Celular: `npx serve` o `python -m http.server 8000` en esta carpeta y entrar por la IP local del PC.
- Prueba automática (Claude): Firefox headless (`firefox.exe -headless -no-remote -profile <dir> -screenshot out.png file:///...`, requiere ejecutar fuera del sandbox). Para ver la escena 3D: copiar el proyecto, poner `preserveDrawingBuffer: true` en `js/escenarios.js`, simular N cuadros con `loop()` en `js/main.js` y volcar `renderer.domElement.toDataURL()` a un `<img>`.
- Prueba de multijugador (Claude): dos Firefox headless con perfiles distintos (anfitrión con código fijo + invitado con `?unirse=`); cada uno descarga un informe de texto y una foto del canvas a su carpeta (prefs `browser.download.dir`). Cerrar solo esos procesos por perfil (`wmic ... CommandLine like '%prof_host%'`), nunca todos los Firefox.
