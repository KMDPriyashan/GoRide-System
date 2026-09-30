function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
          GoRide
        </p>
        <h1 className="mt-3 text-3xl font-bold text-black">Your next ride starts here.</h1>
        <p className="mt-3 text-gray-600">A simpler way to get around Colombo.</p>
        <button className="mt-7 w-full rounded-md bg-black px-5 py-3 font-semibold text-white transition hover:bg-emerald-600">
          Get started
        </button>
      </section>
    </main>
  )
}

export default App