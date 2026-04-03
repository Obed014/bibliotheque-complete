-- supabase-setup.sql

-- Create Authors Table
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bio TEXT
);

-- Create Books Table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author_id INT REFERENCES authors(id),
    published_date DATE,
    ISBN VARCHAR(13),
    copies_available INT DEFAULT 0
);

-- Create Members Table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Loans Table
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(id),
    member_id INT REFERENCES members(id),
    loan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create Indexes for fast lookup
CREATE INDEX idx_books_title ON books (title);
CREATE INDEX idx_authors_name ON authors (name);
CREATE INDEX idx_loans_member_id ON loans (member_id);

-- Row-Level Security Policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_books ON books FOR SELECT USING (true);  -- Open access for example

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_loans ON loans FOR SELECT USING (member_id = current_setting('myapp.current_member_id')::int);

-- Create Views
CREATE VIEW available_books AS
SELECT id, title, author_id
FROM books
WHERE copies_available > 0;

CREATE VIEW member_loans_view AS
SELECT l.id, b.title, l.loan_date, l.return_date
FROM loans l
JOIN books b ON l.book_id = b.id
WHERE l.member_id = current_setting('myapp.current_member_id')::int;