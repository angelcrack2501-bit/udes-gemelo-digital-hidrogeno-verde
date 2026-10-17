# Identidad visual UDES en HYDRO-TWIN UDES

Aplicación de las reglas del Manual de Marca de la Universidad de Santander, tal como fueron entregadas por el autor del proyecto.

## Reglas aplicadas

| Regla | Implementación |
|---|---|
| Azul UDES `#014C97` como color principal | Botones primarios, barras de progreso, elemento seleccionado (etiquetas 3D, nodos del esquema), marca «H₂», resplandor de selección en la escena 3D. |
| Dorado UDES `#CEA284` para acentos | Franja inferior de la barra superior, indicador de la sección activa, anillo de selección en 3D, paso actual de la misión. Solo como acento decorativo, nunca como color de texto. |
| No más de dos colores institucionales por pieza | Solo existen estos dos colores institucionales en el tema; ninguna pieza usa un tercero. |
| Tipografía Open Sans en todos los textos | `next/font/google` → `Open_Sans` (variable `--font-open-sans`). Los datos numéricos usan Open Sans con cifras tabulares. No se usa Aachen BT (exclusiva del logo). |
| Logo: no recrearlo | Se carga el archivo oficial desde `public/brand/logo-udes.svg` o `logo-udes.png`. Mientras no exista, se muestra un espacio reservado «LOGO UDES» (ver `public/brand/README.md`). |
| «VIGILADA MINEDUCACIÓN» bajo el nombre de la universidad | Barra superior: «Universidad de Santander» y, debajo, «VIGILADA MINEDUCACIÓN». |

## Dónde cambiar los colores

Todo color vive en **un único archivo**: [`src/theme/tokens.ts`](../src/theme/tokens.ts).

- `BRAND` contiene los dos colores institucionales.
- `THEMES.dark` y `THEMES.light` definen los tokens de cada modo (fondos, textos, marca, estados, escena 3D, gráficas).
- `themeCss()` convierte los tokens en variables CSS (`--brand`, `--brand-ink`, `--ok`…) que se inyectan en `<head>` desde `src/app/layout.tsx`. La escena 3D lee los mismos tokens con `useTheme()`.
- `brandInk` es un tono aclarado del Azul UDES que se usa solo para texto sobre fondos oscuros, porque `#014C97` sobre fondo oscuro no alcanza el contraste mínimo. Los rellenos de marca siempre son `#014C97`.

## Colores funcionales (seguridad)

Se conservan verde (nominal), ámbar (advertencia), rojo (crítico/disparo) y naranja (falla), más un violeta para la etiqueta «Simulado». Se usan solo para estados, en puntos pequeños, textos de estado y umbrales de gráficas, para que no compitan con la marca. El código de colores de fluidos de la escena (H₂, agua, enfriamiento…) también es funcional, al estilo de un P&ID.

## Modo claro y oscuro

Botón **☀ Modo claro / ☾ Modo oscuro** en la barra superior. Al inicio se sigue la preferencia del sistema operativo y la elección se recuerda en el navegador. Para demostraciones se puede forzar con `?tema=claro` o `?tema=oscuro`.

## Contraste verificado (WCAG 2.x)

Calculado por la prueba automática [`src/theme/tokens.test.ts`](../src/theme/tokens.test.ts), que falla si algún par baja del mínimo.

| Uso | Modo oscuro | Modo claro | Mínimo |
|---|---|---|---|
| Texto principal sobre fondo | 16,3:1 | 15,4:1 | 7:1 |
| Texto principal sobre panel | 15,0:1 | 17,3:1 | 7:1 |
| Texto secundario sobre panel | 9,9:1 | 9,6:1 | 4,5:1 |
| Texto secundario sobre tarjeta | 9,1:1 | 9,1:1 | 4,5:1 |
| Texto terciario / etiquetas pequeñas | 6,6:1 | 6,1:1 | 4,5:1 |
| Texto terciario sobre tarjeta | 6,1:1 | 5,8:1 | 4,5:1 |
| Texto de botón primario (Azul UDES) | 8,5:1 | 8,5:1 | 4,5:1 |
| Acento de marca (etiquetas, enlaces) | 8,9:1 | 8,5:1 | 4,5:1 |
| Elemento activo / seleccionado | 6,8:1 | 7,1:1 | 4,5:1 |
| Estado nominal | 10,0:1 | 5,0:1 | 4,5:1 |
| Advertencia | 10,5:1 | 5,0:1 | 4,5:1 |
| Crítico / disparo | 6,3:1 | 6,5:1 | 4,5:1 |
| Etiqueta «Simulado» | 9,3:1 | 6,1:1 | 4,5:1 |
| Aviso de alcance | 9,6:1 | 4,6:1 | 4,5:1 |
| Etiqueta «Sin conexión a planta» | 6,3:1 | 5,7:1 | 4,5:1 |
| Etiquetas 3D sobre el fondo de la escena | 15,7:1 | 13,2:1 | 4,5:1 |

Nota: el Dorado UDES sobre blanco tiene un contraste aproximado de 2:1, por eso nunca se usa para texto, solo para acentos decorativos.
