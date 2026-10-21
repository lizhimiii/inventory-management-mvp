DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', r.tablename);
  END LOOP;
END $$;
