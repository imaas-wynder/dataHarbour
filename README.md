# DataHarbor (Firebase Studio Project)

This is a Next.js application built within Firebase Studio for managing and exploring datasets. It utilizes Genkit for AI-powered data cleaning and PostgreSQL for persistent data storage.

## Features

*   **Data Upload:** Upload data in JSON format (single objects or arrays).
*   **Dataset Management:**
    *   Create new datasets from uploaded data.
    *   Replace existing datasets.
    *   Switch between different datasets.
*   **Data Preview:** View data entries and their relationships in a table.
*   **Data Filtering:** Filter the data preview based on relationships.
*   **Data Detail View:** Inspect individual data entries.
*   **Manual Editing:** Edit data entries directly via a JSON editor.
*   **AI Data Cleaning:** Use Genkit (Google AI) to suggest and apply data cleaning transformations.
*   **Relationship Management:** Define and view relationships between data entries within a dataset.
*   **Persistent Storage:** Uses PostgreSQL to store datasets, entries, and relationships.

## Getting Started

### Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js (v18 or later recommended) and npm installed.
2.  **PostgreSQL:** Install PostgreSQL server (v12 or later recommended) and have it running. You can install it locally or use a managed service.
3.  **Git:** (Optional, for cloning if not already done).

### Setup

1.  **Clone the Repository (if needed):**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure PostgreSQL:**
    *   Create a PostgreSQL database (e.g., `dataharbor_db`).
    *   Create a PostgreSQL user and grant privileges to the database (e.g., `your_db_user`). Make note of the password.
    *   You can use tools like `psql` or graphical clients (pgAdmin, DBeaver) for this. Example `psql` commands:
        ```sql
        CREATE DATABASE dataharbor_db;
        CREATE USER your_db_user WITH PASSWORD 'your_db_password';
        GRANT ALL PRIVILEGES ON DATABASE dataharbor_db TO your_db_user;
        -- Connect to the database (\c dataharbor_db) and grant schema privileges if needed:
        -- GRANT ALL ON SCHEMA public TO your_db_user;
        ```

4.  **Configure Environment Variables:**
    *   Create a file named `.env` in the root of the project.
    *   Copy the contents from `.env.example` (if provided) or add the following, replacing the placeholder values with your PostgreSQL connection details:
        ```dotenv
        # PostgreSQL Connection Details
        POSTGRES_HOST=localhost # Or your DB host address
        POSTGRES_PORT=5432      # Or your DB port
        POSTGRES_USER=your_db_user
        POSTGRES_PASSWORD=your_db_password
        POSTGRES_DATABASE=dataharbor_db

        # Optional: Google Generative AI API Key (if using AI Cleaning)
        # Obtain an API key from Google AI Studio (https://aistudio.google.com/)
        # GOOGLE_GENAI_API_KEY=YOUR_API_KEY
        ```
    *   **Important:** Add `.env` to your `.gitignore` file to avoid committing sensitive credentials.

5.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application should now be running, typically at `http://localhost:9002`. The database schema (tables) will be automatically created or verified on the first run.

6.  **(Optional) Run Genkit Development Server (for AI features):**
    If you plan to use or develop the AI cleaning features locally, run the Genkit server in a separate terminal:
    ```bash
    npm run genkit:dev
    # Or for auto-reloading on changes:
    # npm run genkit:watch
    ```
    Make sure you have set the `GOOGLE_GENAI_API_KEY` in your `.env` file for Genkit to work.

### Project Structure

*   `src/app/`: Next.js App Router pages and layouts.
*   `src/components/`: Reusable React components (UI, forms, etc.).
*   `src/actions/`: Next.js Server Actions for backend operations.
*   `src/services/`: Backend logic, including `database.ts` for PostgreSQL interactions.
*   `src/ai/`: Genkit related code (flows, configuration).
*   `src/lib/`: Utility functions.
*   `src/hooks/`: Custom React hooks.
*   `.env`: Environment variable configuration (ignored by git).
*   `public/`: Static assets.

## Usage

1.  **Open the application:** Navigate to `http://localhost:9002` (or your configured port).
2.  **Upload Data:** Use the "Upload New Data" form. Paste valid JSON (a single object or an array of objects).
3.  **Confirm Upload:** Choose an action:
    *   **Add/Update in Active Set:** Adds new entries or updates existing ones based on ID in the currently selected dataset.
    *   **Amend Specific Entry:** Replaces the data for a specific ID (requires single object upload without an 'id' field).
    *   **Create/Replace Data Set:** Creates a new dataset or overwrites an existing one with the uploaded data.
4.  **Switch Datasets:** Use the dropdown in the "Data Preview" section to switch between available datasets.
5.  **View/Clean Data:** Click the "View / Clean" button on a row in the preview table to navigate to the detail page.
6.  **Detail Page:**
    *   View the full data entry.
    *   Click "Edit" to manually modify the JSON data.
    *   Click "Clean Data with AI" to get cleaning suggestions (requires Genkit setup and API key). Apply valid suggestions.
    *   Add relationships to other entries by entering the Target Entry ID and clicking "Add Relationship".
    *   View related entries in the table.

## Further Development

*   Implement relationship deletion.
*   Add more sophisticated data visualization options.
*   Enhance error handling and user feedback.
*   Implement user authentication and authorization if needed.
*   Add database migrations for schema changes.
*   Improve AI cleaning prompts and capabilities.
