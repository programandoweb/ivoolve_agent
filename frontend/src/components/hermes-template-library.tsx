'use client';
import {useState} from 'react';
const templates=[
 ['Investigación integral','Investiga el prospecto real de SIC usando research.browser_verify (prospectName, city y activity del contexto SIC). Prioriza fuentes .gov.co, RUES y cámara de comercio; continúa con web oficial, perfiles sociales y Google Imágenes. Registra procedencia de cada hallazgo.'],
 ['Identidad comercial y RUES','Corrobora razón social, NIT si está publicado, dirección y actividad del prospecto SIC usando primero registros públicos y cámaras de comercio. No confundas homónimos ni atribuyas registros indexados como verificados.'],
 ['Sitio oficial','Identifica el sitio web oficial y contrasta el dominio con las fuentes públicas. Reporta si no hay evidencia suficiente.'],
 ['Redes públicas','Busca páginas empresariales públicas de Instagram, Facebook y LinkedIn del prospecto. No eludas accesos restringidos.'],
 ['Opiniones','Verifica si existen fichas públicas y reseñas reales; separa patrones frecuentes de testimonios individuales.'],
 ['Ubicación','Contrasta la ubicación y las direcciones públicas del prospecto con la ficha SIC.'],
 ['Portafolio e imágenes','Investiga los servicios, productos y proyectos visibles de este prospecto y localiza referencias públicas en Google Imágenes, su web y redes. Guarda URL de miniatura, URL observada, destino sugerido y fecha. Distingue imágenes relacionadas de obras propias verificadas; no asumas derechos de reutilización.'],
 ['Señales operativas','Investiga señales públicas de vacantes, sucursales, distribución y crecimiento; no infieras facturación.'],
 ['Presencia institucional','Revisa señales públicas pertinentes de RUES, cámaras de comercio o SECOP sin atribuir coincidencias dudosas.'],
 ['Propuesta contextualizada','Con las fuentes y referencias visuales verificadas, resume qué ofrece la empresa y su portafolio. Redacta hipótesis comerciales fundamentadas y cita cada URL para preparar una propuesta personalizada. No reutilices imágenes sin permisos. No finalices antes de sincronizar SIC.'],
];
export function HermesTemplateLibrary(){
 const[selected,setSelected]=useState(-1);
 return <aside className="flex min-h-0 flex-col rounded-3xl border bg-white shadow-sm lg:max-h-[670px]">
 <header className="shrink-0 border-b p-4"><h2 className="text-lg font-black">Biblioteca Hermes</h2><p className="text-xs text-zinc-500">10 plantillas: seleccionar solo prepara el texto; tú decides cuándo enviar.</p></header>
 <div className="grid min-h-0 gap-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-1">{templates.map(([name,prompt],i)=>
 <button key={name} onClick={()=>{setSelected(i);window.dispatchEvent(new CustomEvent('hermes:template:draft',{detail:{text:prompt+' Indica el prospectId real y utiliza únicamente el researchId autorizado por SIC.'}}));}} className={'rounded-xl border p-3 text-left text-sm hover:bg-violet-50 '+(selected===i?'border-violet-500 bg-violet-50':'border-zinc-200')}><strong>{i+1}. {name}</strong></button>
 )}</div></aside>;
}
