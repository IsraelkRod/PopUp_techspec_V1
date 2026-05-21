# POP UP — Progress & App Flow

_Focus: **Vendors first, then Hosts.** Shopper-facing work is deprioritized._

## Build progress

```mermaid
graph TD
    subgraph DONE["✅ Built & tested (23 tests green)"]
        A[Accounts: sign up / log in / JWT]
        P[Profiles: vendor business + host org]
        POS[Connect POS: Square · Clover · Stripe]
        BF[Backfill -> Vendor Feed with line items]
        KPI[Vendor analytics: gross, avg ticket, top products]
        MKT[Host: Start Project markets + event dates]
        FUN[Vendor funnel: apply -> approve/reject]
        NOT[Notifications on funnel events]
        HOV[Host overview dashboard]
    end

    subgraph NEXT["⏳ Next (code I can do)"]
        HA[Host market analytics: sales per market/event]
        WH[Live webhooks per provider]
        PG[(Postgres persistence)]
    end

    subgraph YOU["🔑 Needs you (accounts/infra)"]
        CR[POS credentials: Clover, Stripe]
        URL[A public web address - hosting]
        DB[A database to connect]
    end

    DONE --> NEXT
    NEXT -.depends on.-> YOU
```

## Vendor flow (the primary user)

```mermaid
sequenceDiagram
    actor V as Vendor
    participant App as POP UP
    participant POS as Square/Clover/Stripe

    V->>App: Sign up / log in
    V->>App: Build business profile (name, category)
    V->>App: "Connect my POS"
    App->>POS: Redirect to authorize
    POS-->>App: Authorized (tokens)
    App->>POS: Backfill recent sales
    POS-->>App: Payments + line items
    App-->>V: Feed populated in seconds
    App-->>V: KPIs: gross, avg ticket, top products
    V->>App: Browse markets, apply to one
    App-->>V: Notified when host decides
```

## Host flow (secondary user)

```mermaid
sequenceDiagram
    actor H as Host
    participant App as POP UP
    actor V as Vendors

    H->>App: Sign up / log in
    H->>App: Build org profile
    H->>App: Start Project (create a market)
    H->>App: List event dates
    V->>App: Apply to the market
    App-->>H: Notified of new application
    H->>App: Approve / reject vendor
    App-->>V: Vendor notified of decision
    H->>App: Overview dashboard (events + applicant counts)
```

## API surface today

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/signup` · `POST /auth/login` · `GET /auth/me` |
| Profile | `GET /profile/me` · `PUT /profile/me` |
| Connect POS | `GET /connect/:provider/{url,callback,status}` (square·clover·stripe) |
| Feed | `GET /feed` |
| Analytics | `GET /analytics/me` |
| Markets | `POST/GET /markets` · `GET /markets/:id` · `POST/GET /markets/:id/events` |
| Funnel | `POST/GET /markets/:id/applications` · `PATCH /markets/:id/applications/:appId` |
| Host | `GET /host/overview` |
| Notifications | `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` |
| Webhooks | `POST /webhooks/pos/:provider` |
