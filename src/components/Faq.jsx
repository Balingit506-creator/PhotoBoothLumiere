export default function Faq() {
  return (
    <section className="section faq" id="faq">
      <div className="section-head center">
        <p className="eyebrow">Questions</p>
        <h2>Good to know</h2>
      </div>
      <details><summary>Do I need to install anything?</summary><p>No. Lumière Booth runs in any modern browser on laptops, tablets and phones. Just allow camera access when asked.</p></details>
      <details><summary>Are my photos stored anywhere?</summary><p>No. Everything happens inside this page. Close the tab and your photos are gone unless you downloaded them.</p></details>
      <details><summary>Can we take photos together from different places?</summary><p>Yes. In the capture step choose <em>Invite a friend</em> and send them the link. Once they join you see each other live, either of you can press the shutter, and every frame puts you side by side. Video and photos travel directly between your two browsers, encrypted, and are never stored on a server.</p></details>
      <details><summary>Can I use photos from my phone's gallery?</summary><p>Yes. Choose <em>Upload</em> in the capture step and pick as many photos as your layout needs.</p></details>
      <details><summary>How do I print my strip?</summary><p>Download the print file and send it to any photo lab. Strips are 2×6 in; the double strip prints as one 4×6 and is cut down the middle into two strips.</p></details>
      <details><summary>Can I use a template I bought or downloaded elsewhere?</summary><p>Yes. If you have a licence to use it, export it as a transparent PNG and add it under <em>Bring your own template</em> in the design step.</p></details>
    </section>
  );
}
