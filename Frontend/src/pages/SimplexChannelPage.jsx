import { useEffect, useState } from 'react';

const SimplexChannelPage = () => {
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://simplex.chat/js/channel-preview.js';
    script.async = true;
    script.addEventListener('error', () => setPreviewFailed(true));
    document.body.appendChild(script);

    return () => script.remove();
  }, []);

  return (
    <main className="min-h-screen bg-[#060a12] px-4 py-12 text-slate-100 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-sm font-bold tracking-widest text-cyan-400">MONEXA FX</p>
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Join our SimpleX channel</h1>
        <p className="mt-3 text-slate-400">
          Preview the channel and connect with the MonexaFX community using SimpleX.
        </p>

        <section className="mt-8 rounded-2xl bg-white p-3 shadow-xl sm:p-5" aria-label="SimpleX channel preview">
          <div
            data-simplex-channel-preview
            data-channel-link="https://smp15.simplex.im/c#uhcYEHU4olSRG7hbFT1rew_bRKGiy8wCUZxJVvd68Is"
            data-channel-id="PxPMkP9NH16uLUZb7XHdLvJxf995iaEvirjW6BcJfUg="
            data-relay-domains="relay3.simplex.chat,relay1.simplex.chat,relay2.simplex.chat"
            data-app-download-buttons="on"
            data-color-scheme="light"
          />
        </section>

        {previewFailed && (
          <p role="status" className="mt-4 text-sm text-amber-300">
            Channel preview could not load. You can still open the channel directly below.
          </p>
        )}

        <a
          href="https://smp15.simplex.im/c#uhcYEHU4olSRG7hbFT1rew_bRKGiy8wCUZxJVvd68Is"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex rounded-xl border border-cyan-700 bg-cyan-950/60 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-900/70"
        >
          Open channel in SimpleX
        </a>
      </div>
    </main>
  );
};

export default SimplexChannelPage;
