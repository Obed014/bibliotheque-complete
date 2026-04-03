-- SQL script to create tables for library management system

-- Table for members
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for books
CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    published_date DATE,
    isbn VARCHAR(20) UNIQUE
);

-- Table for loans
CREATE TABLE loans (
    loan_id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
    loan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_date TIMESTAMP
);

-- Indexes
CREATE INDEX idx_member_email ON members(email);
CREATE INDEX idx_book_title ON books(title);

-- Row Level Security policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Define policies (example)
CREATE POLICY select_members ON members
    FOR SELECT USING (true);

CREATE POLICY select_books ON books
    FOR SELECT USING (true);

CREATE POLICY select_loans ON loans
    FOR SELECT USING (true);