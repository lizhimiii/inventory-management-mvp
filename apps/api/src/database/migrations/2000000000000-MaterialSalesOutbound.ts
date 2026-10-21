import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaterialSalesOutbound2000000000000 implements MigrationInterface {
  name = 'MaterialSalesOutbound2000000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE stock_documents DROP CONSTRAINT IF EXISTS stock_documents_document_type_check`);
    await q.query(`ALTER TABLE stock_documents ADD CONSTRAINT stock_documents_document_type_check CHECK(document_type IN
      ('MATERIAL_INBOUND','FINISHED_INBOUND','PRODUCTION_ISSUE','PRODUCTION_RETURN','PRODUCTION_COMPLETION',
       'FINISHED_OUTBOUND','MATERIAL_SALES_OUTBOUND','INVENTORY_ADJUSTMENT','STOCK_MOVE','STOCK_CHECK',
       'DEFECTIVE_RETURN','DEFECTIVE_REPAIR_RESTOCK','DEFECTIVE_PRODUCTION_RETURN','REVERSAL'))`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE stock_documents DROP CONSTRAINT IF EXISTS stock_documents_document_type_check`);
    await q.query(`ALTER TABLE stock_documents ADD CONSTRAINT stock_documents_document_type_check CHECK(document_type IN
      ('MATERIAL_INBOUND','FINISHED_INBOUND','PRODUCTION_ISSUE','PRODUCTION_RETURN','PRODUCTION_COMPLETION',
       'FINISHED_OUTBOUND','INVENTORY_ADJUSTMENT','STOCK_MOVE','STOCK_CHECK',
       'DEFECTIVE_RETURN','DEFECTIVE_REPAIR_RESTOCK','DEFECTIVE_PRODUCTION_RETURN','REVERSAL'))`);
  }
}
