
      CREATE OR REPLACE FUNCTION get_number()
      RETURNS integer AS $$
      BEGIN
          RETURN 2;
      END; $$
      LANGUAGE plpgsql;
      