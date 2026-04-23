---
description: Cómo conectar tu móvil (Expo Go) con Visual Studio Code
---
Sigue estos pasos para ver los cambios de tu código en tiempo real en tu teléfono:

1. **Instala Expo Go**: Descarga la app "Expo Go" desde la Play Store (Android) o App Store (iOS).
2. **Abre la terminal en VS Code**: Pulsa `Ctrl + Ñ` (o `Ctrl + ` `) para abrir una terminal integrada.
3. **Ve a la carpeta del frontend**:
   ```powershell
   cd travel-pilot/frontend
   ```
4. **Inicia el servidor de desarrollo**:
   // turbo
   ```powershell
   npx expo start --tunnel
   ```
   *Nota: Usamos `--tunnel` para asegurar la conexión incluso si el PC y el móvil están en redes distintas o si el cortafuegos de Windows bloquea la conexión local.*

5. **Escanea el código QR**:
   - En **Android**: Abre Expo Go y pulsa "Scan QR Code".
   - En **iOS**: Abre la app de Cámara y escanea el código.

6. **¡Listo!**: Cualquier cambio que guardes en `App.tsx` se verá reflejado instantáneamente en tu móvil.
