# Bibliothèque Complète

## Supabase Setup Instructions

### 1. Create a Supabase Account

- Go to [Supabase](https://supabase.io/) and sign up for an account if you don’t have one.

### 2. Create a New Project

- After logging in, click on "New Project".
- Enter your project details:
  - **Project Name**: Your desired project name
  - **Organization**: Select or create an organization
  - **Database Password**: Set a strong password for your database
- Click on "Create new project".

### 3. Configure Database

- Once your project is created, navigate to the "Database" section.
- Optional: Set up your database schema using the provided SQL editor or import an existing SQL file.

### 4. API Configuration

- Go to the "API" section in the dashboard for your Supabase project.
- Note down your **API URL** and **anon/public key**; you will need these for your application configuration.

## Usage Guide

### 1. Set Up Your Environment

- Make sure you have Node.js installed.
- Clone your repository:
  ```
  git clone https://github.com/Obed014/bibliotheque-complete.git
  cd bibliotheque-complete
  ```
- Install dependencies:
  ```
  npm install
  ```

### 2. Environment Variables

- Create a `.env` file in the root of your project and add the following:
  ```plaintext
  SUPABASE_URL=your_api_url_here
  SUPABASE_ANON_KEY=your_anon_key_here
  ```

### 3. Running the Application

- Start your application:
  ```
  npm start
  ```

### 4. Accessing the Application

- Open your browser and go to `http://localhost:3000` or the specified port in your configuration to access the application.

## Contributing

Feel free to submit issues or pull requests to enhance the project!