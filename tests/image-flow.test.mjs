import { test, after, afterEach } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://shop.example/",
  pretendToBeVisual: true,
})
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "HTMLInputElement", "Node", "Event", "MutationObserver", "localStorage", "sessionStorage"])
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true })
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.scrollTo = () => {}
HTMLElement.prototype.scrollIntoView = () => {}
let sequence = 0
const revoked = []
URL.createObjectURL = () => `blob:artwork-${++sequence}`
URL.revokeObjectURL = (url) => revoked.push(url)
dom.window.Blob.prototype.arrayBuffer = function () {
  return new Promise((resolve, reject) => {
    const reader = new dom.window.FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(this)
  })
}
const React = await import("react")
const { render, screen, within, cleanup, waitFor, fireEvent } = await import("@testing-library/react")
const { default: userEvent } = await import("@testing-library/user-event")
const {
  getBackendClient, adminApi, syncCatalog, stageImage, takeStagedImage,
  stagedImagePreview, releaseStagedImage, TestAdminWorkspace,
  submitPhotoReview, loadPhotoReviews, loadProductReviews, loadModerationReviews, removeReview, TestPhotoReviews,
} = await import("../.ui-tests/ui-entry.js")
const client = getBackendClient()
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const file = () => new File([png], "art.png", { type: "image/png" })
const productId = "434470ae-34b9-4e53-8928-a6b1c2b7a440"
const oldUrl = "https://images.example/old.png"
const savedUrl = "https://images.example/saved.png"
const poster = {
  id: productId, title: "Artwork", code: "ART-1", category: "Abstract",
  basePrice: 499, sizes: ["A4"], image: oldUrl, alt: "Artwork",
  description: "Print", added: 1, status: "active",
}
const product = {
  id: productId, name: "Artwork", category: "Abstract", price: 499,
  images: [{ id: "old-image", imageUrl: oldUrl, primary: true }],
  variants: [{ variantId: "variant", label: "A4", price: 499, sortOrder: 0 }],
}
const ok = (data) => ({ success: true, data, message: "", status: 200 })
afterEach(() => { cleanup(); localStorage.clear() })
after(() => dom.window.close())

test("admin local artwork previews without exposing a staged URL and passes native form validation", async (t) => {
  t.mock.method(client, "getUser", () => ({ roles: ["Admin"] }))
  t.mock.method(client, "request", async () => ok([]))
  const calls = []
  let stagedUrl
  const api = {
    ...adminApi,
    loadCatalog: async () => ({ posters: [poster], revision: 0 }),
    loadOrders: async () => [],
    loadReviews: async () => [],
    uploadImage: async (picked) => {
      // user-event supplies a jsdom File; staging itself is independent of validation.
      stagedUrl = stageImage(picked)
      return stagedUrl
    },
    saveCatalog: async (catalog) => {
      calls.push(catalog)
      return { posters: [{ ...catalog.posters[0], image: savedUrl }], revision: 1 }
    },
  }
  render(React.createElement(TestAdminWorkspace, { path: "/admin/prints", api }))
  const user = userEvent.setup({ document })
  await user.click(await screen.findByRole("button", { name: /^Edit Artwork/ }))
  const dialog = screen.getByRole("dialog", { name: "Edit poster" })
  await user.upload(within(dialog).getByLabelText("Upload artwork"),
    new window.File([png], "art.png", { type: "image/png" }))
  await waitFor(() => assert.ok(within(dialog).getByRole("img", { name: "Artwork image preview" }).src.startsWith("blob:")))
  assert.equal(within(dialog).queryByLabelText("Artwork image URL"), null)
  assert.equal(dialog.querySelector("form").checkValidity(), true)
  const preview = stagedImagePreview(stagedUrl)
  await user.click(within(dialog).getByRole("button", { name: "Save poster ↗" }))
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null))
  assert.equal(calls[0].posters[0].image, stagedUrl)
  assert.equal(takeStagedImage(stagedUrl), undefined)
  assert.ok(revoked.includes(preview))
})

test("catalog local artwork uploads binary to the correct product, replaces the old row and reloads the saved URL", async (t) => {
  t.mock.method(client, "getUser", () => ({ roles: ["Admin"] }))
  const picked = file()
  const stagedUrl = await adminApi.uploadImage(picked)
  const preview = stagedImagePreview(stagedUrl)
  const calls = []
  let uploaded = false
  t.mock.method(client, "request", async (path, init = {}) => {
    calls.push([path, init])
    if (path.startsWith("/api/admin"))
      return ok([{ ...product, images: uploaded ? [{ id: "saved-image", imageUrl: savedUrl, primary: true }] : product.images }])
    if (path.startsWith("/api/product/image") && init.method === "POST") {
      assert.equal(new URL(path, "https://api.example").searchParams.get("productId"), productId)
      assert.ok(init.body instanceof FormData)
      assert.equal(init.body.get("image").name, picked.name)
      assert.deepEqual(new Uint8Array(await init.body.get("image").arrayBuffer()), png)
      assert.equal(init.body.get("imageUrl"), null)
      uploaded = true
      return ok({ id: "saved-image", productId, imageUrl: savedUrl })
    }
    return ok(null)
  })
  const saved = await adminApi.saveCatalog({ posters: [{ ...poster, image: stagedUrl }], revision: 2 })
  assert.equal(saved.posters[0].image, savedUrl)
  assert.equal(saved.revision, 3)
  assert.ok(calls.some(([path, init]) => path.includes("imageId=old-image") && init.method === "DELETE"))
  assert.ok(calls.some(([path, init]) => path.includes("imageId=saved-image") && path.includes("primary=true") && init.method === "PUT"))
  assert.equal(takeStagedImage(stagedUrl), undefined)
  assert.ok(revoked.includes(preview))
})

test("new product images are attached only after creation and upload failures retain files for retry", async (t) => {
  t.mock.method(client, "getUser", () => ({ roles: ["Admin"] }))
  const stagedUrl = stageImage(file())
  t.after(() => releaseStagedImage(stagedUrl))
  let fail = true
  let created = false
  const deleted = []
  t.mock.method(client, "request", async (path, init = {}) => {
    if (path.startsWith("/api/admin")) return ok([])
    if (path === "/api/product" && init.method === "POST") {
      created = true
      assert.ok(init.body instanceof FormData)
      assert.ok(!init.body.get("product").includes("/staged-upload/"))
      return ok({ id: productId })
    }
    if (path.startsWith("/api/product/image") && init.method === "POST") {
      assert.equal(created, true)
      assert.ok(path.includes(productId))
      return fail ? { success: false, message: "Storage unavailable", status: 500 } : ok({ id: "saved-image", imageUrl: savedUrl })
    }
    if (init.method === "DELETE") deleted.push(path)
    return ok(null)
  })
  const next = [{ ...poster, id: "poster-new", image: stagedUrl }]
  await assert.rejects(syncCatalog(next), /Storage unavailable/)
  assert.ok(takeStagedImage(stagedUrl))
  assert.ok(deleted.includes(`/api/product?productId=${productId}`))
  fail = false
  await syncCatalog(next)
  assert.equal(takeStagedImage(stagedUrl), undefined)
})

test("catalog rejects lost staged files and malformed upload responses without deleting existing artwork", async (t) => {
  t.mock.method(client, "getUser", () => ({ roles: ["Admin"] }))
  const deleted = []
  t.mock.method(client, "request", async (path, init = {}) => {
    if (path.startsWith("/api/admin")) return ok([product])
    if (init.method === "DELETE") deleted.push(path)
    if (init.method === "POST") return ok({ url: savedUrl })
    return ok(null)
  })
  await assert.rejects(syncCatalog([{ ...poster, image: "/staged-upload/lost" }]), /Re-select/)
  const stagedUrl = stageImage(file())
  t.after(() => releaseStagedImage(stagedUrl))
  await assert.rejects(syncCatalog([{ ...poster, image: stagedUrl }]), /did not return/)
  assert.ok(takeStagedImage(stagedUrl))
  assert.deepEqual(deleted, [])
})

test("photo review upload, public/product/admin feeds and deletion share the persisted photo and product", async (t) => {
  t.mock.method(client, "getUser", () => ({ roles: ["Admin"] }))
  const review = { reviewId: "review-1", productId, rating: 5, comment: "Looks great on my wall", photoUrl: savedUrl, city: "Chennai", userEmail: "buyer@example.com" }
  const calls = []
  t.mock.method(client, "request", async (path, init = {}) => {
    calls.push([path, init])
    if (init.method === "POST") {
      assert.ok(init.body instanceof FormData)
      assert.equal(init.body.get("productId"), productId)
      assert.equal(init.body.get("rating"), "5")
      assert.equal(init.body.get("city"), "Chennai")
      assert.equal(init.body.get("comment"), review.comment)
      assert.deepEqual(new Uint8Array(await init.body.get("photo").arrayBuffer()), png)
      return ok(review)
    }
    if (init.method === "DELETE") return ok(null)
    return ok({ reviews: [review], summary: { avgRating: 5, totalReviews: 1 } })
  })
  const input = { productId, name: "Buyer", city: " Chennai ", rating: 5, text: review.comment, consent: true }
  const saved = await submitPhotoReview(input, file())
  assert.equal(saved.id, review.reviewId)
  assert.equal(saved.photo, savedUrl)
  assert.equal(saved.approved, true)
  assert.equal((await loadPhotoReviews())[0].photo, savedUrl)
  assert.equal((await loadProductReviews(productId)).reviews[0].photoUrl, savedUrl)
  assert.equal((await loadModerationReviews())[0].photo, savedUrl)
  await removeReview(review.reviewId)
  assert.ok(calls.some(([path, init]) => path === "/api/review?reviewId=review-1" && init.method === "DELETE"))
  const count = calls.length
  await assert.rejects(submitPhotoReview({ ...input, productId: "" }, file()), /Choose a poster/)
  await assert.rejects(submitPhotoReview({ ...input, consent: false }, file()), /agree/)
  await assert.rejects(submitPhotoReview(input, new File(["bad"], "bad.png", { type: "image/png" })), /not a valid/)
  assert.equal(calls.length, count)
})

test("photo review failures and missing saved photos cannot produce a success-shaped gallery row", async (t) => {
  const input = { productId, name: "Buyer", city: "", rating: 5, text: "Looks great on my wall", consent: true }
  let response = { success: false, message: "Please verify your email", status: 400 }
  t.mock.method(client, "request", async () => response)
  await assert.rejects(submitPhotoReview(input, file()), /verify your email/)
  response = ok({ reviewId: "review-1", productId, rating: 5 })
  await assert.rejects(submitPhotoReview(input, file()), /did not return/)
})

test("submitted review renders the persisted image after its local preview is revoked", async (t) => {
  t.mock.method(client, "getUser", () => ({ sub: "buyer", email: "buyer@example.com", name: "Buyer" }))
  t.mock.method(client, "request", async (path, init = {}) => {
    if (path.startsWith("/api/product?")) return ok([product])
    if (path === "/api/review" && init.method === "POST")
      return ok({ reviewId: "review-1", productId, rating: 5, comment: "Looks great on my wall", photoUrl: savedUrl, userEmail: "buyer@example.com" })
    return ok({ reviews: [] })
  })
  render(React.createElement(TestPhotoReviews))
  const user = userEvent.setup({ document })
  await user.click(screen.getByRole("button", { name: "Share your wall" }))
  await waitFor(() => assert.equal(screen.getByLabelText("Name").value, "Buyer"))
  await user.type(screen.getByLabelText("Your review"), "Looks great on my wall")
  fireEvent.change(screen.getByLabelText(/Wall photo/), { target: { files: [file()] } })
  const localPreview = (await screen.findByRole("img", { name: "Your review photo preview" })).src
  await user.click(screen.getByRole("checkbox"))
  await user.click(screen.getByRole("button", { name: "Submit photo review" }))
  await screen.findByText("Your photo review has been published.")
  const image = screen.getByRole("img", { name: "Customer wall shared by buyer" })
  assert.equal(image.src, savedUrl)
  assert.ok(revoked.includes(localPreview))
  assert.equal(screen.queryByRole("img", { name: "Your review photo preview" }), null)
  await user.click(screen.getByRole("button", { name: "View photo review by buyer" }))
  assert.equal(within(screen.getByRole("dialog", { name: "Photo review by buyer" })).getByRole("img").src, savedUrl)
  await user.click(screen.getByRole("button", { name: "Close photo review" }))
})
