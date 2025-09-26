-- Utworzenie tabeli galerii jeśli nie istnieje
create table if not exists gallery (
  id bigint generated always as identity primary key,
  image_url text not null,
  caption_pl text,
  caption_en text,
  caption_de text,
  caption_es text,
  position int default 0,
  created_at timestamp default now()
);
