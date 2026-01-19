# Copilot Instructions pour FullStack App

- Be concise and direct; avoid unnecessary explanations unless asked
- Use technical terminology appropriate for professional developers
- Provide code-first responses; show examples rather than lengthy descriptions
- Ask clarifying questions when requirements are ambiguous or incomplete
- Explain trade-offs when multiple valid approaches exist
- Be honest about limitations or potential issues in suggested solutions

## Code Generation Rules
- Include comprehensive error handling with proper exception types and edge case validation
- Sanitize and validate all inputs to prevent injection attacks and security vulnerabilities
- Reuse existing code patterns and utilities; avoid duplication
- Match existing code style, formatting, and naming conventions in the project
- Use descriptive, self-documenting names for variables, functions, and types
- Prioritize simple, readable code over complex or clever solutions
- Apply single responsibility principle: one clear purpose per function/class
- Avoid circular dependencies, tight coupling, god objects, and code smells
- Keep functions small and focused; extract complex logic into well-named helpers
- Use appropriate data structures, collections, and algorithms for each use case
- Minimize dependencies; only import what's necessary
- Make code testable with pure functions and minimal side effects
- Integrate with existing architecture, module boundaries, and project structure
- Optimize for performance; avoid inefficient algorithms and memory leaks
- Add documentation only for complex logic; let simple code self-document
- Implement proper typing with strong types and interfaces; avoid loose typing
- Follow established patterns and conventions specific to the project and language
- Do not write code comments if not requested.

## Architecture du Projet

Cette application est un **monorepo Nx** avec une architecture fullstack basée sur **Prisma + NestJS + Angular**.

### Structure Clé
- **Apps** : `apps/backend/nest-app` (NestJS) + `apps/frontend/app-jcm` (Angular)
- **Libs** : Bibliothèques partagées par domaine (`libs/backend/*`, `libs/frontend/*`)
- **Prisma** : Schéma de base de données centralisé dans `libs/prisma/src/lib/prisma/schema.prisma`
- **Scripts** : Utilitaires de configuration dans `scripts/`

## Stack Technique Spécifique

### Prisma (Couche Données)
- **Schéma principal** : `libs/prisma/src/lib/prisma/schema.prisma`
- **Génération** : `pnpm run prisma:generate`

### NestJS (Backend)
- **IAM** : Module d'authentification complet dans `libs/backend/iam`
- **Guards multiples** : Authentication, Roles, Permissions, Policies (tous actifs par défaut)
- **Configuration** : Variables d'environnement via `DbConfigService` et base de données

### Angular (Frontend)
- **Configuration dynamique** : Script `scripts/setenv.ts` génère `environment.ts` depuis `.env`
- **Proxy** : Script `scripts/setproxyconfig.ts` génère `proxy.config.json`
- **Démarrage** : Utilise toujours les scripts de config avant le serve

## Workflows de Développement

### Démarrage Complet
```bash
# 1. Base de données
pnpm run db:docker:up

# 2. Backend (génère config proxy)
pnpm run start:backend:dev

# 3. Frontend (génère environment + proxy)
pnpm run start:frontend:dev
```

### Modifications Schema
1. Modifier `libs/prisma/src/lib/prisma/schema.prisma`
2. `pnpm run start:prisma` (génère + migre)
3. Redémarrer les services

### Seeding
- Configuration : `pnpm run seed-param`
- Données de test : `pnpm run seed-faker`
- Organisation : `pnpm run seed-org`

## Conventions Spécifiques

### Structure des Modules
- **Repository Pattern** : Services utilisent des repositories (ex: `TasksRepository`)
- **CRUD Services** : Services générés automatiquement dans `libs/db/prisma/generated/`
- **Validation** : `class-validator` + `ValidationPipe` global
- **Sérialisation** : `ClassSerializerInterceptor` global

### Gestion des Utilisateurs
- **Auth Multi-mode** : Password + Passwordless + 2FA
- **Soft Delete** : `isDeleted` + `isDeletedDT` 
- **Validation Email** : `AccountValidation` + tokens
<!-- - **Rôles/Permissions** : Système complet avec politiques ZenStack -->

### Configuration
- **Priorité ENV** : Environnement > Base de données (`DbConfigService.searchConfigParamEnvFirst`)
- **Scripts requis** : Toujours exécuter les scripts de config avant développement
- **Proxy requis** : Frontend doit utiliser proxy pour API calls

## Points d'Intégration Critiques

<!-- ### ZenStack Middleware
Route `/zen` expose automatiquement toutes les entités via REST avec politiques d'accès.
Headers requis : `x-user-id`, `x-user-role` -->

### Services Prisma
- `PrismaService` : Service de base
- `EnhancedPrismaService` : Avec politiques ZenStack (recommandé)
- Import : `@db/prisma` pour le service, `@prisma/client` pour les types

### Configuration Environment
Variables critiques à définir dans `.env` :
- `DATABASE_URL`, `API_*`, `NEST_SERVER_*`
- Utiliser `dotenvx` pour les commandes de base

---
description: 'Angular-specific coding standards and best practices'
applyTo: '**/*.ts, **/*.html, **/*.scss, **/*.css'
---

# Angular Development Instructions

Instructions for generating high-quality Angular applications with TypeScript, using Angular Signals and NGRX Signals Store for state management, adhering to Angular best practices as outlined at https://angular.dev.

## Project Context
- Latest Angular version (use standalone components by default)
- TypeScript for type safety
- Angular CLI for project setup and scaffolding through NX
- Follow Angular Style Guide (https://angular.dev/style-guide)
- Use Angular Material  for consistent styling 

## Examples

These are modern examples of how to write an Angular 21 component with signals

```ts
import { Component, signal } from '@angular/core';


@Component({
  selector: '{{tag-name}}-root',
  templateUrl: '{{tag-name}}.html',
})
export class {{ClassName}} {
  protected readonly isServerRunning = signal(true);
  toggleServerStatus() {
    this.isServerRunning.update(isServerRunning => !isServerRunning);
  }
}
```

```css
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;

    button {
        margin-top: 10px;
    }
}
```

```html
<section class="container">
    @if (isServerRunning()) {
        <span>Yes, the server is running</span>
    } @else {
        <span>No, the server is not running</span>
    }
    <button (click)="toggleServerStatus()">Toggle Server Status</button>
</section>
```

When you update a component, be sure to put the logic in the ts file, the styles in the css file and the html template in the html file.

## Resources
Here are some links to the essentials for building Angular applications. Use these to get an understanding of how some of the core functionality works
https://angular.dev/essentials/components
https://angular.dev/essentials/signals
https://angular.dev/essentials/templates
https://angular.dev/essentials/dependency-injection

## Development Standards /## Best practices & Style guide

Here are the best practices and the style guide information.

### Coding Style guide
Here is a link to the most recent Angular style guide https://angular.dev/style-guide

### Architecture
- Use standalone components unless modules are explicitly required
- Organize code by standalone feature modules or domains for scalability
- Implement lazy loading for feature modules to optimize performance
- Use Angular's built-in dependency injection system effectively
- Structure components with a clear separation of concerns (smart vs. presentational components)

### TypeScript Best Practices
- Enable strict mode in `tsconfig.json` for type safety
- Define clear interfaces and types for components, services, and models
- Use type guards and union types for robust type checking
- Implement proper error handling with RxJS operators (e.g., `catchError`)
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v21+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
- `NgOptimizedImage` does not work for inline base64 images.

### Components
- Follow Angular's component lifecycle hooks best practices
- Use `input()` signal instead of decorators, learn more here https://angular.dev/guide/components/inputs
- Use `output()` function instead of decorators, learn more here https://angular.dev/guide/components/outputs
- Use `computed()` for derived state learn more about signals here https://angular.dev/guide/signals.
- Use `viewChild()`, `viewChildren()`, `contentChild()` and `contentChildren()` functions instead of decorators; learn more here https://angular.dev/guide/components/child-component-interaction
- Never use inline templates for components even if they are short
- Never use inline styles for components even if they are short
- Always use signal form for forms, learn more here https://angular.dev/guide/signal-forms
- Leverage Angular's change detection strategy (default or `OnPush` for performance)
- Keep templates clean and logic in component classes or services
- Use Angular directives and pipes for reusable functionality
- Keep components small and focused on a single responsibility
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer Signal forms instead of Reactive or Template-driven ones when Angular Signal Forms are available
- Do NOT use `ngClass`, use `class` bindings instead, learn more here https://angular.dev/guide/templates/binding#css-class-and-style-property-bindings
- Do NOT use `ngStyle`, use `style` bindings instead, learn more here https://angular.dev/guide/templates/binding#css-class-and-style-property-bindings
- When using external templates/styles, use paths relative to the component TS file.

## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

### Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables, prefer signals where possible
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
- Do not write Regular expressions in templates (they are not supported).
- Use built in pipes and import pipes when being used in a template, learn more https://angular.dev/guide/templates/pipes#.
- Use Angular Material components for consistent UI/UX
- Use ngx-translate for internationalization (i18n) when dynamic translations are needed


### Styling
- Use Material v3 design components and theming system for a modern look and feel
- Use Angular's component-level CSS encapsulation (default: ViewEncapsulation.Emulated)
- Prefer SCSS for styling with consistent theming
- Implement responsive design using CSS Grid, Flexbox, or Angular CDK Layout utilities
- Follow Angular Material's theming v3 guidelines
- Maintain accessibility (a11y) with ARIA attributes and semantic HTML
- Always integrate Dark Mode support using Angular Material theming capabilities

### State Management
- Use Angular Signals for reactive state management in components and services
- Use `NGRX signal store` for complex state management (within components or across the application)  
- Use `computed()` for derived state
- Use `linkedSignal()` for interconnected signals
- Use `effect()` for side effects
- Use `toSignal()` to integrate observables
- Use writable signals for mutable state and computed signals for derived state
- Use linkedSignals for sharing state between components
- Handle loading and error states with signals and proper UI feedback
- Use Angular's `AsyncPipe` to handle observables in templates when combining signals with RxJS
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Data Fetching
- Use Angular's `HttpClient` for API calls with proper typing or `httpResource`s for resource management
- Implement RxJS operators for data transformation and error handling if necessary, if not prefer signals
- Avoid Observable subscriptions in components; use the async pipe or signals instead
- Use Angular's `inject()` function for dependency injection in standalone components
- Implement caching strategies (e.g., `shareReplay` for observables)
- Store API response data in signals for reactive updates
- Handle API errors with global interceptors for consistent error handling

### Security
- Sanitize user inputs using Angular's built-in sanitization
- Implement route guards for authentication and authorization
- Use Angular's `HttpInterceptor` for CSRF protection and API authentication headers
- Validate form inputs with Angular's reactive forms and custom validators
- Follow Angular's security best practices (e.g., avoid direct DOM manipulation)

### Performance
- Enable production builds with `ng build --prod` for optimization
- Use lazy loading for routes to reduce initial bundle size
- Optimize change detection with `OnPush` strategy and signals for fine-grained reactivity
- Use trackBy in `ngFor` loops to improve rendering performance
- Implement server-side rendering (SSR) or static site generation (SSG) with Angular Universal (if specified)

### Testing
- Write unit tests for components, services, and pipes using Jasmine and Karma
- Use Angular's `TestBed` for component testing with mocked dependencies
- Test signal-based state updates using Angular's testing utilities
- Write end-to-end tests with Cypress or Playwright (if specified)
- Mock HTTP requests using `provideHttpClientTesting`
- Ensure high test coverage for critical functionality

## Implementation Process
1. Plan project structure and feature modules
2. Define TypeScript interfaces and models
3. Scaffold components, services, and pipes using Angular CLI or NX within monorepo
4. Implement data services and API integrations with signal-based state or NGRX Signals Store
5. Build reusable components with clear inputs and outputs
6. Add signals forms and validation
7. Apply styling with SCSS and responsive design
8. Implement lazy-loaded routes and guards
9. Add error handling and loading states using signals
10. Write unit and end-to-end tests
11. Optimize performance and bundle size

## Additional Guidelines
- Follow the Angular Style Guide for file naming conventions (see https://angular.dev/style-guide), e.g., use `feature.ts` for components and `feature-service.ts` for services. For legacy codebases, maintain consistency with existing pattern.
- Use Angular CLI commands for generating boilerplate code
- Document components and services with clear JSDoc comments
- Ensure accessibility compliance (WCAG 2.1) where applicable
- Use Angular's built-in i18n for internationalization (if specified) and ngx-translate for dynamic translations
- Keep code DRY by creating reusable utilities and shared modules
- Use signals consistently for state management to ensure reactive updates

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:
- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix their problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool


<!-- nx configuration end-->
