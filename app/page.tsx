const Home = () => {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-black">

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-24 text-center">

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
         Cracked AI <span className="text-black/40"></span>
        </h1>

        <p className="mt-6 text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
          On-screen intelligence for your next technical round.
          Real-time structured answers and live code support
          when you're under pressure.
        </p>

      </section>


      {/* MAIN BOX SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-20">

        <div className="border border-black/20 bg-white grid md:grid-cols-2">

          {/* LEFT PANEL */}
          <div className="p-12 border-b md:border-b-0 md:border-r border-black/20">

            <div className="inline-block px-4 py-2 border border-black text-sm font-semibold tracking-widest">
              LIVE SESSION
            </div>

            <h2 className="mt-10 text-4xl font-bold">
              Real-Time Assistance
            </h2>

            <p className="mt-6 text-black/60 leading-relaxed">
              Overlay AI intelligence directly on your interview window.
              Understand complex questions instantly and respond with clarity.
            </p>

            <ul className="mt-10 space-y-4 text-sm font-medium">
              <li>→ Context-aware responses</li>
              <li>→ Live coding insight</li>
              <li>→ Structured explanations</li>
              <li>→ Conversation memory</li>
            </ul>

            <button className="mt-12 px-8 py-4 border border-black font-semibold hover:bg-black hover:text-white transition-all duration-300">
              START SESSION
            </button>

          </div>


          {/* RIGHT PANEL */}
          <div className="p-12 bg-[#fafafa]">

            <div className="text-xs text-black/40 mb-6 tracking-wide">
              PREVIEW
            </div>

            <div className="space-y-6 text-sm">

              <div className="border border-black/20 p-6 bg-white">
                <p className="text-black/40 text-xs mb-2">INTERVIEWER</p>
                Explain how horizontal scaling differs from vertical scaling.
              </div>

              <div className="border border-black p-6 bg-white">
                <p className="text-black/40 text-xs mb-2">AI RESPONSE</p>
                Horizontal scaling adds more machines to handle traffic,
                while vertical scaling increases the power of a single machine.
                Horizontal scaling improves fault tolerance and flexibility.
              </div>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
};

export default Home;