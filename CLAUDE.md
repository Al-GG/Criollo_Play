# Volantines

Juego 3D de elevar volantines hecho con three.js (cargado por CDN con importmap, sin build ni npm).
Todo el juego vive en `index.html`.

## Reglas
- Textos del juego y comentarios en español (chileno).
- Controles siempre suaves: toda entrada (tirar, dar hilo, dirigir) usa rampa gradual, nunca valores bruscos.
- Debe funcionar en PC (teclado/mouse) y celular (botones táctiles, solo visibles en pantallas táctiles).
- Mantener todo simple: sin frameworks ni dependencias extra aparte de three.js.

## Mecánicas actuales
- Física del volantín: arrastre + sustentación según el viento relativo; el hilo es una restricción de largo.
- Viento cambia de tipo cada 10 s (`WIND_TYPES`) y es más fuerte en altura. Rayas blancas lo muestran.
- Personaje articulado; el hilo sale de su mano derecha.
- Escenarios (`BIOMES`): campo, bosque, desierto, playa, ciudad, cerros. Uno al azar por partida (sin repetir el anterior); `?escenario=playa` lo fuerza y la tecla E cambia. El área de juego (radio ~35 m alrededor de z=-15) siempre queda plana.
- Jugador y rivales comparten la misma física (`createFlyer` / `stepFlyer`); rivales con IA (`aiThink`). En cada partida salen 3 o 4 rivales al azar de `RIVAL_POOL`, en posiciones al azar cercanas (`RIVAL_SPOT`, separados al menos 4,5 m).
- Rivales: primero suben a 30-40 m y luego juegan según su personalidad (`STYLES`: rápido, pícaro, defensivo). Siempre elevan los 3; al azar 1 o 2 (máx. `MAX_ATTACKERS`) van a tu altura a atacarte.
- Comisión: si dos hilos se cruzan quedan enredados; tirar o dar hilo "serrucha" y daña el hilo del otro hasta cortarlo.

## Probar
- PC: abrir `index.html` en el navegador (necesita internet por el CDN).
- Celular: `npx serve` o `python -m http.server 8000` en esta carpeta y entrar por la IP local del PC.
