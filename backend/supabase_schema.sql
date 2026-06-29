create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  status text not null default 'processing',
  error_message text,
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  page_number int,
  section text,
  chunk_index int not null,
  token_count int,
  embedding vector(384)
);
create index on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New session',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table session_documents (
  session_id uuid references sessions(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  primary key (session_id, document_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

create or replace function match_chunks(
  query_embedding vector(384), doc_ids uuid[], match_count int)
returns table (id uuid, document_id uuid, content text,
               page_number int, section text, similarity float)
language sql stable as $$
  select c.id, c.document_id, c.content, c.page_number, c.section,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.document_id = any(doc_ids)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
