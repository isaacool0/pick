CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE FUNCTION b64url(b64 TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN replace(replace(trim(trailing '=' FROM b64), '+', '-'), '/', '_');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.categories (
    id TEXT DEFAULT b64url(encode(public.gen_random_bytes(8), 'base64')) NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT, 
    active BOOL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX categories_name_idx ON public.categories(name);

CREATE TABLE public.items (
    id TEXT DEFAULT b64url(encode(public.gen_random_bytes(8), 'base64')) NOT NULL UNIQUE,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    active BOOL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (category, content),
    CONSTRAINT items_category_fkey FOREIGN KEY (category) REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE INDEX items_id_idx ON public.items(id);
CREATE INDEX items_category_idx ON public.items(category);
CREATE INDEX items_category_created_at_idx ON public.items(category, created_at);

CREATE TABLE public.votes (
    item TEXT NOT NULL,
    ip INET NOT NULL,
    vote BOOL NOT NULL,
    voted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item, ip),
    CONSTRAINT votes_item_fkey FOREIGN KEY (item) REFERENCES public.items(id) ON DELETE CASCADE
);

CREATE INDEX votes_item_idx ON public.votes(item);
CREATE INDEX votes_ip_idx ON public.votes(ip);
CREATE INDEX votes_item_vote_idx ON public.votes(item, vote);

CREATE TABLE public.views (
    item TEXT NOT NULL,
    ip INET NOT NULL,
    viewed_on DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (item, ip, viewed_on),
    CONSTRAINT views_item_fkey FOREIGN KEY (item) REFERENCES public.items(id) ON DELETE CASCADE
);

CREATE INDEX views_item_idx ON public.views(item);

