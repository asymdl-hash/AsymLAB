-- Fix FK constraint: material_id deve referenciar materials_catalog (não "materials")
ALTER TABLE milling_records DROP CONSTRAINT IF EXISTS milling_records_material_id_fkey;
ALTER TABLE milling_records ADD CONSTRAINT milling_records_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES materials_catalog(id);
