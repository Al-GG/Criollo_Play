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
- Jugador y rivales comparten la misma física (`createFlyer` / `stepFlyer`); rivales con IA (`aiThink`, lista `RIVALS`).
- Rivales: primero suben a 30-40 m y luego juegan según su personalidad (`STYLES`: rápido, pícaro, defensivo). Solo uno sale a atacar a la vez.
- Comisión: si dos hilos se cruzan quedan enredados; tirar o dar hilo "serrucha" y daña el hilo del otro hasta cortarlo.

## Probar
- PC: abrir `index.html` en el navegador (necesita internet por el CDN).
- Celular: `npx serve` o `python -m http.server 8000` en esta carpeta y entrar por la IP local del PC.
