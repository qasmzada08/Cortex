import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { parseDeckOrThemeJson, parsePptxBuffer, parsePptxSlideXml } from './importFiles.ts';

test('parseDeckOrThemeJson detects and normalizes both deck JSON and theme JSON', () => {
  const themeResult = parseDeckOrThemeJson(
    JSON.stringify({
      name: 'Cyber Amber',
      hexBg: '#120E0A',
      hexAccent: '#F59E0B',
      accentStyle: 'left-rail',
      cornerStyle: 'sharp',
    })
  );
  assert.equal(themeResult.kind, 'theme');
  assert.equal(themeResult.theme.hexBg, '120E0A');
  assert.equal(themeResult.theme.accentStyle, 'left-rail');
  assert.equal(themeResult.theme.cornerStyle, 'sharp');

  const deckResult = parseDeckOrThemeJson(
    JSON.stringify({
      title: 'Solar Microgrids',
      language: 'Spanish',
      theme: 'matrix',
      slides: [{ layout: 'title', title: 'Bienvenidos', subtitle: 'Plan 2026' }],
    })
  );
  assert.equal(deckResult.kind, 'deck');
  assert.equal(deckResult.deck.languageCode, 'es');
  assert.equal(deckResult.deck.slides[0].title, 'Bienvenidos');
});

test('parsePptxSlideXml extracts background hex and slide shapes', () => {
  const xml = `
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld>
        <p:bg><p:bgPr><a:solidFill><a:srgbClr val="040A06"/></a:solidFill></p:bgPr></p:bg>
        <p:spTree>
          <p:sp>
            <p:spPr><a:xfrm><a:off x="0" y="900000"/></a:xfrm></p:spPr>
            <p:txBody><a:p><a:r><a:rPr sz="3600"/><a:t>Architecture Overview</a:t></a:r></a:p></p:txBody>
          </p:sp>
          <p:sp>
            <p:spPr><a:xfrm><a:off x="0" y="2500000"/></a:xfrm></p:spPr>
            <p:txBody><a:p><a:r><a:rPr sz="1600"/><a:t>Modular batteries deployed cleanly</a:t></a:r></a:p></p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>
  `;
  const parsed = parsePptxSlideXml(xml);
  assert.equal(parsed.bgHex, '040A06');
  assert.equal(parsed.texts.length, 2);
  assert.equal(parsed.texts[0].fontSizePt, 36);
  assert.equal(parsed.texts[0].text, 'Architecture Overview');
});

test('parsePptxBuffer opens a valid .pptx zip archive with slides, notes, and theme', async () => {
  const zip = new JSZip();
  zip.file(
    'ppt/presentation.xml',
    `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst>
    </p:presentation>`
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
    </Relationships>`
  );
  zip.file(
    'ppt/slides/slide1.xml',
    `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill></p:bgPr></p:bg>
      <p:spTree><p:sp><p:txBody><a:p><a:r><a:rPr sz="3800"/><a:t>Edge Compute Strategy</a:t></a:r></a:p><a:p><a:r><a:rPr sz="1800"/><a:t>Low-latency roadmap</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`
  );
  zip.file(
    'ppt/slides/slide2.xml',
    `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:rPr sz="2800"/><a:t>Key Takeaways</a:t></a:r></a:p><a:p><a:r><a:rPr sz="1600"/><a:t>Deploy regional nodes</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/>
    </Relationships>`
  );
  zip.file(
    'ppt/notesSlides/notesSlide1.xml',
    `<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:t>Introduce the Q3 budget targets</a:t></a:p></p:notes>`
  );

  const buf = await zip.generateAsync({ type: 'uint8array' });
  const deck = await parsePptxBuffer(buf, 'Edge Strategy.pptx');
  assert.equal(deck.title, 'Edge Strategy');
  assert.equal(deck.slides.length, 2);
  assert.equal(deck.slides[0].title, 'Edge Compute Strategy');
  assert.equal(deck.slides[0].speakerNotes, 'Introduce the Q3 budget targets');
  assert.equal(deck.customTheme?.hexBg, '0F172A');
});
