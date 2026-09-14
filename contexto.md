# Contexto del negocio — Xamu

Nota importante para Claude Code: las cifras de este documento (costos, precios, referencias de producto) son contexto para que entiendas el negocio, NO datos que debas precargar ni dejar fijos en el sistema. Todos los datos de productos, pedidos, costos, precios y gastos de publicidad los ingresa el dueño desde la interfaz una vez esté construida. El sistema no debe traer nada "hardcodeado" de este documento — solo úsalo para entender el dominio, el flujo de trabajo y el tono del negocio.

## Quién soy
Estudiante de Ingeniería de Sistemas en la Pontificia Universidad Javeriana, Bogotá, Colombia. Además de la universidad, manejo dos líneas de negocio de importación y reventa por Facebook Marketplace.

## Línea 1 — Chaquetas de moto (importación desde China)
- Sourcing desde China para reventa en Colombia.
- Demanda validada directamente en Facebook Marketplace: ~100 mensajes de interesados en 5 horas al publicar.
- Proveedor: LYSCHY, referencia LY2057 BLACK — costo aproximado 114,926 COP/unidad puesto en Colombia (landed cost) en la validación inicial.
- Agente de carga: David — tarifa 4,000,000 COP/m³, mínimo 500,000 COP.
- Precio de venta objetivo explorado: 250,000–300,000 COP por unidad.
- Ya se revisaron facturas proforma y listas de empaque; se generaron fotos de producto con IA (Gemini/"Nanobanana") y mensajes de negociación con el proveedor en inglés.
- Estado: en camino / próximas a llegar. El dueño necesita el sistema de ventas listo ANTES de que lleguen, porque espera un pico de demanda fuerte (ya hay ~100 interesados de la validación inicial).

## Línea 2 — Jellycat (peluches, importación desde China)
- Presupuesto tope por pedido explorado: ~2,000,000 COP.
- Proveedor encontrado vía redes sociales; mezcla de referencias — principalmente "cakes" y "croissant", combinadas con "popcorn" y otras variadas del mismo estilo.
- El proveedor ofrece empaque al vacío gratis para el envío.
- Precio de venta planeado explorado: 70,000–90,000 COP por unidad.

## Publicidad
Xamu invierte en publicidad para mover estos productos (por ejemplo, impulsar publicaciones en Facebook Marketplace/Meta). Este es un costo real del negocio que debe poder registrarse en el sistema y descontarse de la ganancia — no es un dato fijo, varía por campaña/publicación y lo ingresa el dueño.

## Cómo vende actualmente
- Canal único: Facebook Marketplace (publica producto, responde mensajes de interesados, cierra la venta por chat).
- No tiene web propia, no tiene checkout online, no usa ninguna plataforma de e-commerce.
- La entrega es de dos formas:
  1. **El comprador recoge en la casa de Xamu** (sin costo de domicilio, sin dirección de destino que registrar).
  2. **Domicilio**: Xamu tiene que llevar/enviar el producto a una dirección del comprador — necesita saber claramente a quién y a dónde debe hacer esa entrega, para no perder ese compromiso entre tantos mensajes de Marketplace.
- No hay integración posible con la API de Facebook Marketplace (Meta no expone una API pública para leer los chats/pedidos automáticamente) — la carga de cada pedido siempre será manual, hecha por Xamu, pero debe ser rápida.

## El problema que motiva este sistema
Cuando lleguen las chaquetas, Xamu espera un volumen de ventas alto y simultáneo con los jellycats ya en curso. Hoy no tiene ningún sistema — todo está en la cabeza o en chats de Marketplace dispersos. Teme que el negocio "colapse" operativamente: perder de vista a quién le vendió qué, quién ya pagó, a quién le debe domicilio y a dónde, y cuánto stock le queda de cada referencia.

## Lo que Xamu necesita ver, en sus palabras
- Ingresos y ganancias de forma fácil y visual.
- Saber, para cada pedido, si debe hacer domicilio y a dónde exactamente.
- Poder abrir el sistema igual desde el celular que desde el computador, con los mismos datos sincronizados (no dos copias distintas).
- Cargar un pedido nuevo de forma muy simple, lo más automatizado posible — quiere que el precio, costo y ganancia por producto se calculen solos, sin tener que sacar cuentas a mano.
- Ver gráficas — las más importantes que usan los vendedores para visualizar sus números, no solo tablas.

## Preferencias de trabajo de Xamu (aplican también al código)
- No usar negrilla en el chat ni raya larga "—" en las respuestas de texto que Claude le da (esto es preferencia de conversación, no necesariamente del producto en sí).
- Para talleres de código de la universidad prefiere trabajar guiado, paso a paso — pero este es un proyecto de negocio real que quiere entregado funcionando, no un ejercicio académico guiado.
- Empezando a usar conventional commits (en inglés) en sus proyectos — si el trabajo con Claude Code incluye control de versiones, seguir ese estándar (feat:, fix:, chore:, etc.).
