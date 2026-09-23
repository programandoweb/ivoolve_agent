import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export type TemplateInput = {
  title: string;
  description: string;
  sector: string;
  defaultCity: string;
  defaultDepartment: string;
  defaultQuantity: number;
  promptTemplate: string;
};
type StoredTemplate = TemplateInput & { id: string; builtin: boolean; updatedAt?: string };

const RULES = [
  'Emplea exclusivamente la herramienta prospecting.browser_maps_search conectada a la extensión Chrome Argos.',
  'No utilices Google Places API, Custom Search ni inventes negocios o datos faltantes.',
  'Incluye city y department explícitos al invocar la herramienta.',
  'Los resultados deben guardarse primero en la memoria persistente de Argos y sincronizarse automáticamente con SIC.',
  'Si SIC está caído, no vuelvas a navegar: informa el batchId y cuántos quedaron pendientes de sincronización para recuperarlos desde la pestaña Sincronización SIC.',
  'Comunica separadamente empresas recopiladas, confirmadas en SIC y pendientes o fallidas, usando exclusivamente las cantidades que devuelva persistence.',
].join('\n');

const builtin = [
  { id: 'builtin-textil', title: 'Confección textil', description: 'Fábricas, maquilas y talleres de confección.', sector: 'confección textil y fábricas de ropa', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-calzado', title: 'Fábricas de zapatos', description: 'Fabricantes de zapatos, marroquinería y talleres.', sector: 'fabricantes de calzado y fábricas de zapatos', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-estetica', title: 'Centros estéticos y manicuristas', description: 'Centros de estética, uñas y belleza.', sector: 'centros estéticos y manicuristas', defaultCity: 'Dosquebradas', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-automotriz', title: 'Empresas automotrices', description: 'Talleres mecánicos y negocios del sector automotriz.', sector: 'empresas del sector automotriz', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-boutiques', title: 'Boutiques femeninas', description: 'Boutiques y tiendas de ropa femenina.', sector: 'boutiques y tiendas de ropa femenina', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-turismo', title: 'Agencias de turismo', description: 'Operadores y agencias de viajes locales.', sector: 'agencias de viajes y operadores turísticos', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-restaurantes', title: 'Restaurantes', description: 'Restaurantes y negocios gastronómicos.', sector: 'restaurantes y negocios gastronómicos', defaultCity: 'Dosquebradas', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-constructoras', title: 'Constructoras y ferreterías', description: 'Constructoras, ferreterías y materiales de construcción.', sector: 'constructoras, ferreterías y proveedores de materiales de construcción', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-muebles', title: 'Fabricantes de muebles', description: 'Carpinterías, talleres y fábricas de mobiliario.', sector: 'fabricantes de muebles y carpinterías', defaultCity: 'Dosquebradas', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
  { id: 'builtin-distribuidoras', title: 'Distribuidoras mayoristas', description: 'Negocios mayoristas y distribuidores comerciales.', sector: 'distribuidoras mayoristas y comercializadoras', defaultCity: 'Pereira', defaultDepartment: 'Risaralda', defaultQuantity: 10 },
].map(t => ({
  ...t, builtin: true,
  promptTemplate: 'Investiga {{quantity}} empresas reales del sector {{sector}} en {{city}}, {{department}}, Colombia. Busca empresas diferentes, conserva nombres, teléfonos, direcciones, sitios web, categorías, calificaciones y enlaces de Google Maps solo cuando estén visibles.\n\n' + RULES,
}));

type Row = RowDataPacket & {
  id: string; title: string; description: string; sector: string;
  default_city: string; default_department: string; default_quantity: number;
  prompt_template: string; updated_at: Date;
};

@Injectable()
export class ArgosTaskTemplatesService {
  constructor(private readonly db: DatabaseService) {}

  async list(tenantId: string): Promise<StoredTemplate[]> {
    if (!this.db.enabled) throw new ServiceUnavailableException('La biblioteca requiere MariaDB.');
    const rows = await this.db.query<Row[]>(
      'SELECT * FROM argos_task_templates WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 100',
      [tenantId],
    );
    return [
      ...builtin,
      ...rows.map(r => ({
        id: r.id, builtin: false, title: r.title, description: r.description,
        sector: r.sector, defaultCity: r.default_city,
        defaultDepartment: r.default_department, defaultQuantity: r.default_quantity,
        promptTemplate: r.prompt_template, updatedAt: r.updated_at.toISOString(),
      })),
    ];
  }

  private validate(input: TemplateInput): TemplateInput {
    const required = ['title', 'description', 'sector', 'defaultCity', 'defaultDepartment', 'promptTemplate'] as const;
    for (const key of required) {
      if (!input[key] || typeof input[key] !== 'string' || !input[key].trim()) {
        throw new BadRequestException('Falta el campo: ' + key);
      }
    }
    if (!Number.isInteger(input.defaultQuantity) || input.defaultQuantity < 1 || input.defaultQuantity > 100) {
      throw new BadRequestException('La cantidad debe estar entre 1 y 100.');
    }
    if (input.promptTemplate.length > 8000) throw new BadRequestException('La plantilla no puede superar 8000 caracteres.');
    for (const marker of ['{{sector}}', '{{city}}', '{{department}}', '{{quantity}}']) {
      if (!input.promptTemplate.includes(marker)) throw new BadRequestException('La plantilla necesita ' + marker);
    }
    return input;
  }

  async create(input: TemplateInput, tenantId: string, actor?: string): Promise<{ id: string }> {
    this.validate(input);
    const id = randomUUID(), now = new Date();
    await this.db.execute(
      `INSERT INTO argos_task_templates (id, tenant_id, title, description, sector, default_city,
       default_department, default_quantity, prompt_template, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, input.title.trim(), input.description.trim(), input.sector.trim(),
        input.defaultCity.trim(), input.defaultDepartment.trim(), input.defaultQuantity,
        input.promptTemplate.trim(), actor || null, now, now],
    );
    return { id };
  }

  async update(id: string, input: TemplateInput, tenantId: string): Promise<{ id: string }> {
    this.validate(input);
    const result = await this.db.execute(
      `UPDATE argos_task_templates SET title=?, description=?, sector=?, default_city=?,
       default_department=?, default_quantity=?, prompt_template=?, updated_at=?
       WHERE id=? AND tenant_id=?`,
      [input.title.trim(), input.description.trim(), input.sector.trim(), input.defaultCity.trim(),
        input.defaultDepartment.trim(), input.defaultQuantity, input.promptTemplate.trim(),
        new Date(), id, tenantId],
    );
    if (!result.affectedRows) throw new NotFoundException('Plantilla inexistente.');
    return { id };
  }

  async remove(id: string, tenantId: string): Promise<{ ok: true }> {
    const result = await this.db.execute('DELETE FROM argos_task_templates WHERE id=? AND tenant_id=?', [id, tenantId]);
    if (!result.affectedRows) throw new NotFoundException('Plantilla inexistente.');
    return { ok: true };
  }

  // Render happens on backend to prevent free-text prompts from bypassing the
  // Chrome-only and durable-SIC contract. The user explicitly presses Execute.
  render(template: string, fields: { sector: string; city: string; department: string; quantity: number }): string {
    if (!Number.isInteger(fields.quantity) || fields.quantity < 1 || fields.quantity > 100) {
      throw new BadRequestException('Cantidad fuera del rango 1-100.');
    }
    const values: Record<string, string> = {
      sector: fields.sector.trim(), city: fields.city.trim(),
      department: fields.department.trim(), quantity: String(fields.quantity),
    };
    if (Object.values(values).some(v => !v || v.length > 200)) {
      throw new BadRequestException('Completa sector, ciudad y departamento.');
    }
    const rendered = template.replace(/{{(sector|city|department|quantity)}}/g, (_, key: string) => values[key]);
    // Las reglas son obligatorias incluso en plantillas creadas por el usuario.
    return rendered + '\n\nREQUISITOS OBLIGATORIOS DE EJECUCIÓN:\n' + RULES;
  }

  async prepare(tenantId: string, templateId: string, fields: { sector: string; city: string; department: string; quantity: number }) {
    const templates = await this.list(tenantId);
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new NotFoundException('Plantilla inexistente.');
    return { prompt: this.render(template.promptTemplate, fields) };
  }
}
