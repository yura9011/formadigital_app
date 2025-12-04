# Project Coding Guidelines

This document outlines the strict coding standards and architectural principles to be followed for this project. Adherence to these guidelines is mandatory to ensure the codebase remains clean, scalable, and maintainable.

---

### 1. File Length and Structure

- Never allow a file to exceed **500 lines**.
- If a file approaches **400 lines**, break it up immediately.
- Treat **1000 lines** as unacceptable, even temporarily.
- Use folders and clear naming conventions to keep small files logically grouped.

### 2. OOP-First Mentality

- Every piece of functionality should be encapsulated in a dedicated class, struct, or protocol, even if it's small.
- Favor **composition over inheritance**, but always apply object-oriented thinking.
- Code must be built for **reuse**, not just to "make it work."

### 3. Single Responsibility Principle (SRP)

- Every file, class, and function must do **one thing only**.
- If a component has multiple responsibilities, split it immediately.
- Each view, manager, or utility should be laser-focused on a single, well-defined concern.

### 4. Modular Design

- Code should connect like Lego bricks – **interchangeable, testable, and isolated**.
- Always ask: “Can I reuse this class in a different screen or a completely different project?” If the answer is no, refactor it.
- Aggressively reduce tight coupling between components. Favor techniques like **dependency injection** and protocol-based communication.

### 5. Manager and Coordinator Patterns

- Use `ViewModel`, `Manager`, and `Coordinator` naming conventions for clear logic separation:
  - **UI Logic** → `ViewModel`
  - **Business Logic** → `Manager`
  - **Navigation & State Flow** → `Coordinator`
- Never mix views and business logic directly.

### 6. Function and Class Size

- Keep functions under **30-40 lines**.
- If a class grows over **200 lines**, critically assess it for opportunities to split into smaller helper classes.

### 7. Naming and Readability

- All class, method, and variable names must be **descriptive and intention-revealing**.
- Avoid vague, generic names like `data`, `info`, `helper`, or `temp`. A name should clearly communicate the component's role and purpose.

### 8. Scalability Mindset

- Always code as if someone else will be responsible for scaling your work.
- Include extension points (e.g., protocol conformance, dependency injection) from day one to facilitate future growth.

### 9. Avoid "God Classes"

- Never allow one file or class to hold all the logic (e.g., a massive `ViewController`, `ViewModel`, or `Service`).
- Proactively split large classes into more granular components, such as `UI`, `State`, `Handlers`, `Networking`, etc.
