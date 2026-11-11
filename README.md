**Video walkthrough:** https://youtu.be/0NxNkMViVAo

---

# ReadMore API — Express + MongoDB (Mongoose)

Your first backend API assignment. Build a small REST API for a bookstore using **Express.js**, with **MongoDB** as the database and **Mongoose** as the modelling layer.

There are **two entities** — **Author** and **Book** — and they are **linked**: one author can have many books, and every book belongs to one author. You will model them, connect to MongoDB, and build endpoints for each.

Then, in **Part 4**, the store "goes live" and your endpoints have to enforce **real business rules** the database won't enforce on its own. That part is where the marks are — it rewards how you *think*, not just whether the CRUD works.

> **Before you start:** watch the Mongoose video shared with this assignment. It covers connecting to MongoDB, defining schemas and models, and the basic query methods you will need. This is a take-home assignment — you are expected to work out the *how* yourself.

---

## What you need

- **Node.js 18+** and **npm**
- **MongoDB** — either a local install or a free **MongoDB Atlas** cluster
- An API client to test your endpoints: **Postman**, **Insomnia**, or the VS Code **REST Client** extension
- Suggested packages: `express`, `mongoose`, `dotenv` (and `nodemon` for development)

---

## The data model

```
authors ──< books
```

One author has **many** books; each book belongs to **one** author. The link is a field on the book that stores the author's id.

| Entity  | Fields                                                              |
|---------|--------------------------------------------------------------------|
| Author  | `name`, `country`, `bio`                                           |
| Book    | `title`, `genre`, `price`, `publishedYear`, `author` (→ Author id) |

---

## Suggested project structure

Keep the code organised. A route should only map a URL to a function; the **controller** is the function that does the actual work — reading the request, applying the rules, talking to the database, and choosing the response and status code. Keeping them apart is where most of the marks live: your routes will be short, your controllers will have to *think*.

```
readmore-api/
├── .env             ← your MongoDB connection string (do NOT commit real secrets)
├── .gitignore       ← ignore node_modules and .env
├── server.js        ← app entry point: connect to DB + start the server
├── models/          ← Author and Book schemas
├── controllers/     ← the logic lives here
└── routes/          ← wire URLs to controller functions
```

---

## Part 0 — Project setup

Get a server running and connected to MongoDB before you build anything else.

- Initialise the project and install your dependencies.
- Store your MongoDB connection string in a `.env` file (never hard-code it).
- Connect to MongoDB on startup and only start listening once the connection succeeds.
- Add a health-check route (`GET /`) that returns a simple JSON message.

---

## Part 1 — Define the two models

> **Concept:** a Mongoose **schema** describes the shape of a document; a **model** is what you use to read and write those documents. The link between two collections is made with a field of type `ObjectId` that **references** the other model — this is what later lets you `populate` the author's full details onto a book.

- Create the **Author** model with the fields listed above.
- Create the **Book** model, including the `author` field that references the Author model. This reference is what links the two entities.
- Decide which fields should be **required**.

---

## Part 2 — Author endpoints

Build these five endpoints for the **Author** entity, mounted under `/authors`.

| # | Method   | Path            | What it does              |
|---|----------|-----------------|---------------------------|
| 1 | `POST`   | `/authors`      | Create a new author       |
| 2 | `GET`    | `/authors`      | Get **all** authors       |
| 3 | `GET`    | `/authors/:id`  | Get **one** author by id  |
| 4 | `PUT`    | `/authors/:id`  | Update an author          |
| 5 | `DELETE` | `/authors/:id`  | Delete an author          |

Put the logic in a controller; keep the route file to wiring only. For read-one, update, and delete, return **404** with a helpful message when no author has that id.

---

## Part 3 — Book endpoints (the linked entity)

Build the same five endpoints for the **Book** entity, mounted under `/books`.

| # | Method   | Path          | What it does                    |
|---|----------|---------------|---------------------------------|
| 1 | `POST`   | `/books`      | Create a book **for an author** |
| 2 | `GET`    | `/books`      | Get all books                   |
| 3 | `GET`    | `/books/:id`  | Get one book by id              |
| 4 | `PUT`    | `/books/:id`  | Update a book                   |
| 5 | `DELETE` | `/books/:id`  | Delete a book                   |

When you create a book, the request body must include the id of an author that already exists:

```json
{
  "title": "The Silent Sea",
  "genre": "Thriller",
  "price": 24.99,
  "publishedYear": 2021,
  "author": "<an existing author id>"
}
```

### Requirements
- **Show the link.** On `GET /books` and `GET /books/:id`, the author should appear as the **full author details**, not just an id. (Mongoose has a feature for this — find it in the video.)
- Return **404** when a book id is not found.
- **Add one linking endpoint:** `GET /authors/:id/books` — return all books written by that author.

---

## Part 4 — The Scenario: ReadMore goes live

> **This is the part that tests your thinking.** So far your controllers just move data in and out. Now the store is opening to real customers, and the product owner hands you rules the API must enforce. **MongoDB will not enforce these for you** — your controllers have to. Some have an obvious solution; at least one has *no single right answer*, and you must choose an approach and defend it.

Read all six requirements before writing code — some affect each other.

### 1 — No orphan books
A book must belong to a **real** author. If someone tries to create a book with an author id that doesn't exist, reject it with **400** and don't save it.
> The Book schema already marks `author` as required. Why is that *not enough* to stop a made-up id?

### 2 — No duplicate titles per author
The same author may not have two books with the **same title**, treated case-insensitively (`"the silent sea"` = `"The Silent Sea"`). Reject a duplicate with **409**.
> This rule is per-author, not global — two *different* authors may each write a book called "Home". Your check has to reflect that.

### 3 — Rules the schema can't express
Reject with **422** and a helpful message if `price` is zero or negative, or if `publishedYear` is in the future or before 1450.

### 4 — Deleting an author who still has books *(the hard one)*
Deleting an author currently leaves their books pointing at an id that no longer exists (**orphans**). Fix this. Three reasonable policies exist:

| Option | Behaviour                                                                   |
|--------|-----------------------------------------------------------------------------|
| **A**  | **Block** the delete — return **409** if the author still has books.         |
| **B**  | **Cascade** — delete the author *and* all of their books.                   |
| **C**  | **Reassign** — move the books to a fallback author before deleting.         |

**Pick ONE, implement it, and justify it out loud in your video:** why you chose it and what its downside is — every option has one.
> What would a real bookstore want? Does your answer change if the books have already been sold?

### 5 — A search & filter endpoint
Upgrade `GET /books` to accept these **optional** query parameters, in any combination:

```
GET /books?genre=Thriller&minPrice=10&maxPrice=30&search=sea&sort=price&order=asc
```

| Param                 | Effect                                                          |
|-----------------------|----------------------------------------------------------------|
| `genre`               | only books of that genre                                       |
| `minPrice`/`maxPrice` | price within the range (either, both, or neither may appear)   |
| `author`              | only books by that author id                                   |
| `search`              | title contains this text (case-insensitive)                    |
| `sort` + `order`      | sort by `price`, `title`, or `publishedYear`, ascending/descending |

The catch: **only the parameters actually present should be applied.** If the client sends none, return everything. You must build the query **dynamically** — do not write a separate hard-coded query for every combination.
> What does your filter look like with only `genre`? Only `minPrice`? Both prices? Sketch it before coding.

### 6 — Author statistics
Add `GET /authors/:id/stats` returning a summary computed from that author's books:

```json
{
  "author": "Chinua Achebe",
  "bookCount": 4,
  "averagePrice": 21.5,
  "cheapestBook": "Things Fall Apart",
  "mostExpensiveBook": "Anthills of the Savannah"
}
```

If the author has **no books**, return sensible values instead of crashing — decide what "sensible" means.

**Challenge:** add **pagination** to `GET /books` (`page` and `limit` params) and include `page`, `limit`, `total`, and the `results` in the response.

---

## What to submit


Submit a **a Github repository link** containing your project code. The repository must also contain **a video recording** in which you walk through your entire implementation. Your video should:

- Show the code for your models, controllers, and routes, explaining what each part does.
- Run the server and demonstrate **every endpoint** live in your API client (Postman/Insomnia/REST Client).
- Demonstrate each **Part 4** business rule working — the rejected orphan (400), the rejected duplicate (409), the rejected invalid price/year (422), your author-delete policy, `GET /books` with **at least two filters combined**, and `GET /authors/:id/stats`.
- **Explain your reasoning out loud**, especially your choice of author-delete policy (Requirement 4) and its downside.

> I will be grading how you *think*, so narrate your decisions — don't just click through.

Good luck — build it one endpoint at a time, and test each in your API client before moving on.
---

---

# My Implementation

## Run it
```bash
npm install
cp .env.example .env     # then put your real MongoDB connection string in .env
npm run dev
```
Manual test requests are in `requests.http` (VS Code REST Client extension).

## Structure
- `models/` Author and Book schemas
- `controllers/` all logic, rules and status codes
- `routes/` URL to controller wiring only
- `middleware/` async wrapper and central error handler
- `utils/` `HttpError` class

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Health check |
| POST / GET | `/authors` | Create / list authors |
| GET / PUT / DELETE | `/authors/:id` | Read / update / delete an author |
| GET | `/authors/:id/books` | All books by an author |
| GET | `/authors/:id/stats` | Book count, average price, cheapest, most expensive |
| POST / GET | `/books` | Create / search, filter, sort and paginate books |
| GET / PUT / DELETE | `/books/:id` | Read / update / delete a book |

`GET /books` query params: `genre`, `author`, `search`, `minPrice`, `maxPrice`, `sort` (price, title, publishedYear), `order` (asc, desc), `page`, `limit`. All are optional and combinable. The response is `{ page, limit, total, totalPages, results }`.

## Status codes
| Code | When |
|---|---|
| 400 | Missing or invalid fields, malformed id, unknown author id (orphan book), bad query params |
| 404 | Author or book id not found |
| 409 | Duplicate title for the same author, or deleting an author who still has books |
| 422 | price <= 0, or publishedYear in the future or before 1450 |

Check order when saving a book: shape (400), business rules (422), author exists (400), duplicate title (409).

## Design decisions
- **Orphans:** `required` only checks a value is present, so the controller looks the author up.
- **Duplicate titles:** case-insensitive, per author. A controller check gives a friendly 409, and a unique collation index on `{author, title}` backs it up against simultaneous requests.
- **Author delete policy: Option A (block with 409).** A real bookstore keeps sales and order history tied to books. Cascading would destroy that data, and reassigning would attribute books to the wrong author. Downside: staff must delete or move an author's books manually first. There is also a tiny race window between the check and the delete.
- **Stats with no books:** `bookCount: 0` and `null` for price-based fields (0 would wrongly say the books are free).
- **Malformed ids** return 400; well-formed ids that do not exist return 404.
- **PUT** is partial: only the fields sent are changed, and all rules still apply.
