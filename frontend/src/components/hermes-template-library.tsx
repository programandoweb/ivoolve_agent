'use client';
import {useState} from 'react';
// Selecting a template only prepares editable text, never authorizes Google APIs.
const hermesPolicy = 'OBLIGATORIO: utiliza exclusivamente la extensión Chrome Hermes con research.browser_verify y guarda las evidencias mediante outbox en SIC. Prioriza fuentes estatales, RUES y cámaras. Incluye URL, fecha y método para cada dato. No utilices Google API ni otras APIs y no cambies de proveedor si Chrome falla. Si no existe una investigación real iniciada desde SIC, informa que se requiere researchId y prospectId auténticos.';
const templates=[
 ['Debida diligencia integral','Evalúa las tres dimensiones del prospecto: perfil corporativo y fit comercial; salud financiera/operativa; cumplimiento legal, tributario, listas restrictivas y reputación. Consulta fuentes públicas oficiales primero. Si faltan documentos indica DATO NO DETECTADO - REQUIERE SOLICITUD DIRECTA AL PROSPECTO. No inventes calificación de riesgo sin evidencia.'],
 ['Identidad comercial y RUES','Corrobora razón social, NIT si está publicado, dirección y actividad del prospecto SIC usando primero registros públicos y cámaras de comercio. No confundas homónimos ni atribuyas registros indexados como verificados.'],
 ['Sitio oficial','Identifica el sitio web oficial y contrasta el dominio con las fuentes públicas. Reporta si no hay evidencia suficiente.'],
 ['Redes públicas','Busca páginas empresariales públicas de Instagram, Facebook y LinkedIn del prospecto. No eludas accesos restringidos.'],
 ['Reputación pública','Investiga reseñas y reputación mediante evidencias públicas visibles en Chrome; separa patrones de casos aislados. No utilices Google Places API ni declares reseñas que no puedas observar.'],
 ['Ubicación','Contrasta la ubicación y las direcciones públicas del prospecto con la ficha SIC.'],
 ['Portafolio e imágenes','Investiga los servicios, productos y proyectos visibles de este prospecto y localiza referencias públicas en Google Imágenes, su web y redes. Guarda URL de miniatura, URL observada, destino sugerido y fecha. Distingue imágenes relacionadas de obras propias verificadas; no asumas derechos de reutilización.'],
 ['Finanzas y capacidad','Busca estados financieros públicamente publicados, periodos y cifras; calcula indicadores solo cuando hay datos suficientes. Si falta información de buró o balance, señálala para solicitar al prospecto. No infieras impago por falta de datos.'],
 ['Compliance institucional','Revisa fuentes públicas oficiales aplicables: RUES/cámaras, autoridad tributaria, Superintendencia, SECOP, Rama Judicial, OFAC y ONU si hay fuentes accesibles. Contrasta identidad y marca los portales no consultados.'],
 ['Propuesta contextualizada','Con las fuentes y referencias visuales verificadas, resume qué ofrece la empresa y su portafolio. Redacta hipótesis comerciales fundamentadas y cita cada URL para preparar una propuesta personalizada. No reutilices imágenes sin permisos. No finalices antes de sincronizar SIC.'],
];
export function HermesTemplateLibrary(){
 const[selected,setSelected]=useState(-1);
 return <aside className="flex min-h-0 flex-col rounded-3xl border bg-white shadow-sm lg:max-h-[670px]">
 <header className="shrink-0 border-b p-4"><h2 className="text-lg font-black">Biblioteca Hermes</h2><p className="text-xs text-zinc-500">10 plantillas: seleccionar solo prepara el texto; tú decides cuándo enviar.</p></header>
 <div className="grid min-h-0 gap-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-1">{templates.map(([name,prompt],i)=>
 <button key={name} onClick={()=>{setSelected(i);window.dispatchEvent(new CustomEvent('hermes:template:draft',{detail:{text:hermesPolicy+'\\n\\n'+prompt+'\\n\\nIncluye recuentos separados: evidencias capturadas, conservadas por Agent, confirmadas en SIC y pendientes. No ejecutes sic.research.complete si falta sincronización.'}}));}} className={'rounded-xl border p-3 text-left text-sm hover:bg-violet-50 '+(selected===i?'border-violet-500 bg-violet-50':'border-zinc-200')}><strong>{i+1}. {name}</strong></button>
 )}</div></aside>;
}
