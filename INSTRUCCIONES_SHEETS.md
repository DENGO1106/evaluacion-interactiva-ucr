# Configuración de Google Sheets como Base de Datos

Sigue estos pasos para conectar la aplicación a Google Sheets. Toma alrededor de 5 minutos.

## Paso 1: Crear la Hoja de Cálculo

1. Ve a [Google Sheets](https://sheets.new) y crea una nueva hoja de cálculo.
2. Nómbrala **Evaluaciones UCR**.
3. En la primera fila, escribe los siguientes encabezados (exactamente en este orden):
   - Celda A1: `ID`
   - Celda B1: `Shot`
   - Celda C1: `Fecha`
   - Celda D1: `Valor`
4. ¡Opcional! Puedes poner la primera fila en negrita o darle color.

## Paso 2: Crear el Script (API)

1. En la hoja de cálculo, ve al menú superior y haz clic en **Extensiones** > **Apps Script**.
2. Se abrirá una nueva pestaña. Borra todo el código que aparece ahí (`function myFunction() { ... }`).
3. Copia y pega el siguiente código completo:

```javascript
const SHEET_NAME = "Hoja 1"; // Cambia esto si tu hoja tiene otro nombre en la pestaña de abajo

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME) || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'add') {
      sheet.appendRow([data.id, data.shotName, data.timestamp, data.value]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } else if (data.action === 'clear') {
      // Borrar todas las filas excepto la cabecera
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Action not found' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME) || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // Si solo hay encabezados, retornar array vacío
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Convertir a array de objetos, saltando la fila 0 (encabezados)
    const results = [];
    for (let i = 1; i < data.length; i++) {
      results.push({
        id: data[i][0],
        shotName: data[i][1],
        timestamp: data[i][2],
        value: data[i][3]
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Manejar preflight de CORS
function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
```

## Paso 3: Publicar el Script

1. Haz clic en el botón azul **Implementar** (arriba a la derecha) > **Nueva implementación**.
2. Haz clic en el ícono de engranaje (⚙️) junto a "Seleccionar tipo" y elige **Aplicación web** (Web app).
3. Configura los siguientes campos:
   - **Descripción**: API Evaluación (o lo que quieras)
   - **Ejecutar como**: `Yo (tu.correo@gmail.com)`
   - **Quién tiene acceso**: `Cualquier persona` (¡Muy importante para que la app funcione sin pedir login!)
4. Haz clic en **Implementar**.
5. Google te pedirá "Autorizar acceso". Haz clic, elige tu cuenta. Te saldrá una advertencia de que la app no está verificada. Haz clic en "Avanzado" (o "Advanced") y luego en "Ir a Proyecto sin título (inseguro)". Da los permisos requeridos.
6. Copia la **URL de la aplicación web** (termina en `/exec`).

## Paso 4: Conectar la App

Una vez que tengas la URL, abre el archivo `app.js` de la aplicación y pega la URL en la primera línea donde dice:

```javascript
const APPS_SCRIPT_URL = "PEGA_AQUI_TU_URL";
```

¡Eso es todo!
