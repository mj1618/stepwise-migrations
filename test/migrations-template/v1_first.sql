create table first (
  id serial primary key,
  name text not null
);

ALTER TABLE first ADD COLUMN age int;