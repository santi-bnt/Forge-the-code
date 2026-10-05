# Forge the Code

Forge the Code es una plataforma educativa local para aprender Algorithms, Python, C, C++ y Embedded Systems. Las lecciones, prácticas, notas y progreso viven en el dispositivo. No hay cuentas, backend ni servicios de IA.

## Estado de la fase 2

| Área | Implementación |
| --- | --- |
| Learning paths | Cinco rutas con módulos y estados Completed, Current, Available y Locked; abrir cualquier tema sigue permitido. |
| Lecciones | Motor por datos locales con Overview, Learn, Example, Visualize, Quick Check y Review. |
| Contenido | Algorithms: 10 lecciones y 17 ejercicios. Python: 8 y 12. C: 8 y 11. C++: 10 y 15. Embedded: 10 lecciones, 10 retos y 3 mini proyectos. |
| Visualizaciones | Binary search paso a paso, stack, queue, linked list, recorridos de árbol, memoria, conversor decimal/binario/hex y registro de bits. |
| Editores | CodeMirror. Python usa Pyodide local; C y C++ compilan con Clang y WASI locales dentro de un Web Worker. |
| Embedded | Forge Virtual MCU con GPIO, botón, ADC, PWM, UART, registro de eventos, semáforo acelerado y retos verificables. |
| Progreso | IndexedDB guarda lecciones, intentos Run/Submit, ejercicios resueltos, pistas, soluciones vistas, borradores, notas, guardados, racha y ajustes. |
| Datos portátiles | Backup JSON v2 validado, importación Merge/Replace y compatibilidad de lectura con backups v1 del MVP. |
| PWA | Service Worker y pantalla Offline Storage. “Ready for offline use” aparece después de comprobar todos los recursos del build en caché. |
| Responsive | Navegación y paneles Learn/Code/Output para teléfono y tablet en vertical; separador arrastrable y accesible por teclado entre lección y editor en tablet horizontal. |

Los conteos anteriores salen del contenido presente en `src/content/lessons.ts` y `src/content/embedded.ts`; el Embedded Practice se guarda aparte de los ejercicios con harness de funciones.

## Requisitos e instalación

- Node.js 20.19+ o 22.12+.
- npm.
- Para instalar como PWA, navegador moderno con soporte de Service Workers. En iPhone/iPad: Safari → Compartir → Agregar a pantalla de inicio.

```bash
npm install
npm run dev
```

Abre la dirección indicada por Vite. Los runtimes C/C++ están en `public/runtimes/runno`; `predev` y `prebuild` copian Pyodide desde npm a `public/runtimes/pyodide`. Las ejecuciones en el navegador no consultan servicios externos.

## Verificación de código

```bash
npm run lint
npm test
npm run build
npm run preview
```

Vitest cubre el almacenamiento IndexedDB, la migración y fusión de backups, estructura de las rutas y secciones, conteos de contenido, adaptadores de tests, API del simulador y límites temporales. El build escribe en `dist/`.

## Uso offline

El Service Worker guarda el shell al abrir la aplicación. En **Settings → Offline Storage**, selecciona **Download for offline use** y espera **Ready for offline use**. La pantalla muestra bytes observados en la caché por grupo, además del uso total informado por el navegador. El tamaño medido durante la revisión local fue 71.3 MB; puede variar con cambios de contenido, compresión y versión de navegador.

Checklist manual para cada dispositivo:

1. Abre Forge the Code con conexión y espera a que cargue.
2. Instálala como PWA si se usará instalada.
3. Abre Settings → Offline Storage y descarga todos los recursos.
4. Confirma que aparezca “Ready for offline use”.
5. Cierra la PWA y activa modo avión.
6. Vuelve a abrirla y entra a una lección.
7. Ejecuta Python, C y C++ desde sus rutas.
8. Abre Virtual Board y ejecuta un reto Embedded.
9. Completa un ejercicio y escribe una nota.
10. Cierra y abre de nuevo; confirma que nota y progreso siguen ahí.

La descarga offline completa de recursos fue comprobada en una vista previa local. La apertura en modo avión y la instalación nativa de PWA deben comprobarse en el dispositivo objetivo; este entorno no simula el modo avión del sistema operativo. El navegador puede borrar datos si aplica límites de almacenamiento. El progreso de localhost y el de una URL publicada pertenecen a orígenes diferentes. Los breakpoints estrechos se comprobaron visualmente; el separador de tablet horizontal está implementado y cubierto por tipos, pero requiere validación táctil en un iPad físico.

## Arquitectura

```text
src/
  components/       rutas, secciones, editor, visualizaciones, runner UI y placa
  content/          módulos locales tipados y retos Embedded
  runner/           harness, límites temporales y compilación WASI local
  storage/          IndexedDB, normalización y backups JSON versionados
  workers/          ejecución aislada de la interfaz
public/
  sw.js             shell y descarga/inspección de recursos offline
  runtimes/runno/   Clang, wasm-ld y sysroot C/C++ local
  runtimes/pyodide/ Pyodide copiado desde npm durante dev/build
scripts/
  copy-runtimes.mjs
  offline-manifest.mjs
```

**Python:** Pyodide llama `solve(...)` por caso dentro de un worker. Las operaciones con archivos de lección usan el filesystem virtual de Pyodide; la app no concede acceso al filesystem real del dispositivo.

**C/C++:** el harness añade un `main` de prueba, Clang compila a WASM, `wasm-ld` enlaza libc/libc++, y WASI ejecuta el binario con filesystem virtual. Los artefactos se descargan localmente y no se solicita una API remota.

**Run y Submit:** Run filtra casos ocultos. Submit ejecuta todos los casos y marca el ejercicio resuelto solo cuando pasan todos. Inputs y valores esperados de casos ocultos no se muestran en el resultado de Submit.

**Embedded:** el firmware llama una API C educativa que emite líneas de evento. La UI interpreta eventos para representar LED, PWM, UART y semáforo. No modela un MCU específico.

## Límites conocidos

- Los tests ocultos están en los recursos estáticos porque la app debe funcionar offline; no son una barrera antitrampa.
- El código de cada reto del runner de funciones trabaja con arreglos numéricos y resultados escalares. El harness no cubre aún estructuras complejas ni pruebas de stdin arbitrario.
- El límite normal de ejecución es 5 s para el binario WASI y 15 s para el código Python, después de cargar/compilar el runtime. El inicio tiene un margen mayor para compilación en frío. Al excederlo, el worker se termina; no hay límite de memoria que sea fiable y configurable en todos los navegadores.
- Embedded simula eventos y entradas discretas. Los tiempos del semáforo están acelerados; no hay interrupciones con latencia, ADC eléctrico, control físico, mapa de registros de un fabricante ni scheduler FreeRTOS real.
- El contenido enumera I2C, SPI y RTOS y explica sus conceptos, pero estos buses y primitivas de RTOS no se ejecutan como periféricos del simulador todavía.
- Los recursos offline requieren almacenamiento disponible y política de caché del navegador. La PWA no puede impedir que el navegador elimine una caché bajo presión de espacio.
- Las pruebas automatizadas no sustituyen la checklist en modo avión ni la QA en tamaños físicos de iPhone/iPad; las pestañas Learn/Code/Output se usan en pantallas estrechas y las columnas se apilan en pantallas angostas.

La ejecución local se diseñó para ejercicios educativos personales. No debe usarse como sandbox de servidor ni para código hostil con información sensible en el mismo origen.
