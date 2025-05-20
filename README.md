
> **Note:** This application was built entirely using ![Firebase Studio](https://github.com/user-attachments/assets/db74fe74-c2f9-4a3e-b7e6-bc5399a49748) **Firebase Studio** – no manual coding was involved.

# ClarityBud - Personal Finance & Budgeting App

ClarityBud is a modern, full-stack web application designed to help you manage your personal finances with clarity. Track your income and expenses, set budgets, and visualize your spending patterns.

## Features

*   **Dashboard Overview**: Get a quick snapshot of your total income, expenses, and net balance for the current month.
*   **Transaction Management**:
    *   Add, edit, and delete income or expense transactions.
    *   Assign transactions to custom categories.
    *   Filter transactions by description, category, or type.
    *   Sort transactions by date, description, amount, or type.
*   **Category Management**:
    *   Create, edit, and delete custom spending/income categories.
    *   Assign icons and colors to categories for better visual identification.
*   **Budgeting**:
    *   Set monthly, weekly, or yearly budgets for different expense categories.
    *   Track your spending progress against your budget limits.
    *   View overall budget progress and remaining amounts.
*   **Visual Analytics**:
    *   **Spending by Category**: Pie chart showing the distribution of your expenses.
    *   **Budget vs. Actual Spending**: Bar chart comparing budgeted amounts to actual spending per category.
    *   **Spending Over Time**: Line chart illustrating your daily spending trend.
*   **Currency Selection**: Choose your preferred currency (USD, EUR, GBP, JPY, CAD, CNY, RON) for displaying all monetary values.
*   **Data Persistence**: Uses an SQLite database to store all your financial data (categories, transactions, budgets, settings).
*   **Data Import/Export**: Easily export all your application data to a JSON file and import it back.
*   **Responsive Design**: User-friendly interface across different screen sizes.
*   **Dark Mode**: Supports a dark theme for comfortable viewing.

## Tech Stack

*   **Frontend**:
    *   Next.js (App Router)
    *   React
    *   TypeScript
    *   Tailwind CSS
    *   ShadCN UI (for UI components)
    *   Lucide React (for icons)
    *   Recharts (for charts)
*   **Backend/Data**:
    *   Next.js Server Actions
    *   SQLite (database)
    *   `sqlite` & `sqlite3` npm packages
*   **Form Handling & Validation**:
    *   React Hook Form
    *   Zod
*   **Utilities**:
    *   `date-fns` (for date formatting and manipulation)
    *   `clsx`, `tailwind-merge`

## Local Setup & Running

Follow these steps to get ClarityBud running on your local machine.

### Prerequisites

*   Node.js (v18.x, v20.x or later recommended)
*   npm (v9.x, v10.x or later) or yarn

### 1. Clone the Repository (or Download Project Files)

If you have the project as a Git repository:
```bash
git clone https://github.com/endege/ClarityBud.git
cd claritybud
```
If you downloaded the project files, navigate to the project's root directory.

### 2. Install Dependencies

Install the project dependencies using npm or yarn:
```bash
npm install
```
or
```bash
yarn install
```

### 3. Run the Development Server

```bash
npm run dev
```
or
```bash
yarn dev
```
This will start the Next.js development server, usually on `http://localhost:9002` (as configured in `package.json`).

### 4. Access the Application

Open your browser and navigate to `http://localhost:9002` (or the port shown in your terminal for the Next.js app).

## Database

*   ClarityBud uses **SQLite** for data storage.
*   The database file, `claritybud.sqlite`, will be automatically created in the root of your project directory when you first run the application.
*   On the first run with an empty database, the application will perform an initial data seeding with mock categories, transactions, and budgets to help you get started. This seeding is a one-time operation.

## Building for Production

To create a production build:
```bash
npm run build
```
And to run the production build:
```bash
npm run start
```
Ensure any necessary production environment variables are set in your deployment environment.

```
