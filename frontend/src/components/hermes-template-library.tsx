'use client';
import {useState} from 'react';
const templates=[
 ['Investigación integral','Investiga el prospecto existente indicado por SIC. Usa research.browser_verify con consultas específicas de nombre, ciudad y actividad. Registra fuentes y distingue hechos, inferencias y desconocidos.'],
 ['Identidad comercial','Corrobora el nombre, dirección, dominio y actividad del prospecto SIC en Google Search público. No confundas empresas homónimas.'],
 ['Sitio oficial','Identifica el sitio web oficial y contrasta el dominio con las fuentes públicas. Reporta si no hay evidencia suficiente.'],
 ['Redes públicas','Busca páginas empresariales públicas de Instagram, Facebook y LinkedIn del prospecto. No eludas accesos restringidos.'],
 ['Opiniones','Verifica si existen fichas públicas y reseñas reales; separa patrones frecuentes de testimonios individuales.'],
 ['Ubicación','Contrasta la ubicación y las direcciones públicas del prospecto con la ficha SIC.'],
 ['Portafolio','Identifica líneas de producto y servicios que figuren expresamente en páginas públicas.'],
 ['Señales operativas','Investiga señales públicas de vacantes, sucursales, distribución y crecimiento; no infieras facturación.'],
 ['Presencia institucional','Revisa señales públicas pertinentes de RUES, cámaras de comercio o SECOP sin atribuir coincidencias dudosas.'],
 ['Síntesis','Sintetiza evidencias verificadas, inferencias separadas y vacíos. No finalices sic.research.complete hasta confirmar sincronización SIC.'],
];
export function HermesTemplateLibrary(){
 const[selected,setSelected]=useState(-1);
 return <aside className="flex min-h-0 flex-col rounded-3xl border bg-white shadow-sm lg:max-h-[670px]">
 <header className="shrink-0 border-b p-4"><h2 className="text-lg font-black">Biblioteca Hermes</h2><p className="text-xs text-zinc-500">10 plantillas: seleccionar solo prepara el texto; tú decides cuándo enviar.</p></header>
 <div className="grid min-h-0 gap-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-1">{templates.map(([name,prompt],i)=>
 <button key={name} onClick={()=>{setSelected(i);window.dispatchEvent(new CustomEvent('hermes:template:draft',{detail:{text:prompt+' Indica el prospectId real y utiliza únicamente el researchId autorizado por SIC.'}}));}} className={'rounded-xl border p-3 text-left text-sm hover:bg-violet-50 '+(selected===i?'border-violet-500 bg-violet-50':'border-zinc-200')}><strong>{i+1}. {name}</strong></button>
 )}</div></aside>;
}
