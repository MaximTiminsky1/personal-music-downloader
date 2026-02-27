create table if not exists user_tokens (
  id uuid default gen_random_uuid() primary key,
  session_id text unique not null,
  yandex_token text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists user_tokens_session_id_idx on user_tokens(session_id);

alter table user_tokens enable row level security;

create policy "Allow all operations on user_tokens"
  on user_tokens
  for all
  using (true)
  with check (true);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_user_tokens_updated_at
  before update on user_tokens
  for each row
  execute function update_updated_at_column();
