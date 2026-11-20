// Fake Tauri backend so the built UI renders in a plain browser for the README and site screenshots.
// `npx vite build && npx vite preview --port 5799`, then in headless Playwright at 1440x900:
// clear localStorage first (a saved font or theme would leak into the shots),
// page.addInitScript({ path: 'scripts/screenshot-mock.js' }), emulateMedia({ colorScheme }),
// page.route('**/demo/pasted.png', r => r.fulfill({ path: 'docs/logo.png' })),
// open /?note=1 (note), Ctrl+P and type "li" (search), /?note=2 (mind map), /?note=4 (pasted image).
(() => {
  const now = Date.now();
  const notes = new Map();
  let nextId = 8;
  let session = { open_tabs: [1], active_tab: 1 };
  const noteParam = new URLSearchParams(location.search).get('note');
  if (noteParam) {
    const id = Number(noteParam);
    if (Number.isInteger(id)) {
      session = { open_tabs: [id], active_tab: id };
    }
  }

  const note1Content = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Weekend trip to Lisbon' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'A quick two-day escape to ' },
          { type: 'text', text: 'Lisbon', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' for the weekend. The plan is to keep it simple, focus on ' },
          { type: 'text', text: 'food and viewpoints', marks: [{ type: 'highlight' }] },
          { type: 'text', text: ', and not overpack.' }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Packing' }]
      },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Passport and wallet' }] }] },
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Charger and cable' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Comfortable walking shoes' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Light rain jacket' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Small daypack' }] }] }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Places' }]
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sunset viewpoint in Graca' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Time Out Market for lunch' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'LX Factory for coffee and browsing' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pastries in Belem before the flight home' }] }] }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Booking' }]
      },
      {
        type: 'codeBlock',
        attrs: { language: 'json' },
        content: [{ type: 'text', text: '{\n  "flight": "TP 1234",\n  "from": "LHR",\n  "to": "LIS",\n  "depart": "Sat 09:40",\n  "return": "Sun 18:25",\n  "seat": "14C"\n}' }]
      }
    ]
  });

  const note2Content = JSON.stringify({
    nodeData: {
      id: 'root',
      topic: 'Q1 side projects',
      children: [
        {
          id: 'cli',
          topic: 'CLI tool',
          children: [
            { id: 'cli-rust', topic: 'Rust rewrite' },
            { id: 'cli-plugin', topic: 'Plugin API' },
            { id: 'cli-docs', topic: 'Docs' }
          ]
        },
        {
          id: 'saas',
          topic: 'SaaS',
          children: [
            { id: 'saas-pricing', topic: 'Pricing page' },
            { id: 'saas-email', topic: 'Email onboarding' }
          ]
        },
        {
          id: 'oss',
          topic: 'Open source',
          children: [
            { id: 'oss-triage', topic: 'Bug triage' },
            { id: 'oss-release', topic: 'Release notes' },
            { id: 'oss-call', topic: 'Community call' }
          ]
        },
        {
          id: 'hardware',
          topic: 'Hardware',
          children: [
            { id: 'hardware-keyboard', topic: 'Keyboard firmware' },
            { id: 'hardware-sensor', topic: 'Sensor calibration' }
          ]
        }
      ]
    }
  });

  const note3Content = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Grocery list' }]
      },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Oat milk' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coffee beans' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sourdough bread' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Avocados' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Basil' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Olive oil' }] }] }
        ]
      }
    ]
  });

  const note4Content = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Meeting notes - design review' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Reviewed the new ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'app icon' },
          { type: 'text', text: '. Everyone liked the fennec; keep the orange, simplify the notebook at small sizes.' }
        ]
      },
      // Served by a Playwright route (see the header): the real app stores pasted images as asset URLs.
      { type: 'image', attrs: { src: '/demo/pasted.png', alt: 'New app icon' } },
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export the icon at 16, 32 and 256 px' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Update the favicon' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Retake the screenshots in light and dark' }] }] }
        ]
      }
    ]
  });

  const note5Content = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Book ideas' }]
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A calm productivity system' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tiny home network setup' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rust for web developers' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Weekend travel planning' }] }] }
        ]
      }
    ]
  });

  const note6Content = JSON.stringify({
    nodeData: {
      id: 'root',
      topic: 'Home network',
      children: [
        {
          id: 'lan',
          topic: 'LAN',
          children: [
            { id: 'lan-switch', topic: 'Switch' },
            { id: 'lan-print', topic: 'Print server' }
          ]
        },
        {
          id: 'wifi',
          topic: 'Wi-Fi',
          children: [
            { id: 'wifi-mesh', topic: 'Mesh nodes' },
            { id: 'wifi-channel', topic: 'Channel plan' }
          ]
        },
        {
          id: 'iot',
          topic: 'IoT',
          children: [
            { id: 'iot-sensors', topic: 'Sensors' },
            { id: 'iot-cameras', topic: 'Cameras' }
          ]
        }
      ]
    }
  });

  const rustSnippet = 'fn main() {\n    let notes = vec!["Lisbon", "Groceries"];\n    for note in notes {\n        println!("{}", note);\n    }\n}';
  const note7Content = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Rust snippets' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'A small example for printing a list of notes.' }]
      },
      {
        type: 'codeBlock',
        attrs: { language: null },
        content: [{ type: 'text', text: rustSnippet }]
      }
    ]
  });

  notes.set(1, {
    id: 1,
    kind: 'doc',
    title: 'Weekend trip to Lisbon',
    updated_at: now - 5 * 60 * 1000,
    renamed: false,
    pinned: false,
    locked: false,
    content: note1Content
  });

  notes.set(2, {
    id: 2,
    kind: 'mindmap',
    title: 'Q1 side projects',
    updated_at: now - 40 * 60 * 1000,
    renamed: false,
    pinned: false,
    locked: false,
    content: note2Content
  });

  notes.set(3, {
    id: 3,
    kind: 'doc',
    title: 'Grocery list',
    updated_at: now - 3 * 60 * 60 * 1000,
    renamed: false,
    pinned: true,
    locked: false,
    content: note3Content
  });

  notes.set(4, {
    id: 4,
    kind: 'doc',
    title: 'Meeting notes - design review',
    updated_at: now - 26 * 60 * 60 * 1000,
    renamed: false,
    pinned: false,
    locked: false,
    content: note4Content
  });

  notes.set(5, {
    id: 5,
    kind: 'doc',
    title: 'Book ideas',
    updated_at: now - 3 * 24 * 60 * 60 * 1000,
    renamed: false,
    pinned: false,
    locked: false,
    content: note5Content
  });

  notes.set(6, {
    id: 6,
    kind: 'mindmap',
    title: 'Home network',
    updated_at: now - 5 * 24 * 60 * 60 * 1000,
    renamed: false,
    pinned: false,
    locked: false,
    content: note6Content
  });

  notes.set(7, {
    id: 7,
    kind: 'doc',
    title: 'Rust snippets',
    updated_at: now - 9 * 24 * 60 * 60 * 1000,
    renamed: false,
    pinned: false,
    locked: false,
    content: note7Content
  });

  const callbacks = new Map();
  let callbackId = 0;

  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { windowLabel: 'main', label: 'main' }
    },
    transformCallback(cb) {
      callbackId += 1;
      callbacks.set(callbackId, cb);
      return callbackId;
    },
    unregisterCallback(id) {
      callbacks.delete(id);
    },
    convertFileSrc(path) {
      return path;
    },
    async invoke(cmd, args) {
      const a = args || {};

      switch (cmd) {
        case 'list_notes':
          return Array.from(notes.values())
            .map(({ content, ...meta }) => meta)
            .sort((x, y) => y.updated_at - x.updated_at);

        case 'load_note': {
          const id = Number(a.id);
          return notes.has(id) ? { ...notes.get(id) } : null;
        }

        case 'get_session':
          return { ...session };

        case 'get_hotkey':
          return 'Ctrl+Alt+Space';

        case 'list_trash':
          return [];

        case 'search': {
          const query = String(a.query || '').toLowerCase();
          return Array.from(notes.values())
            .filter((note) => note.title.toLowerCase().includes(query))
            .map(({ content, ...meta }) => meta)
            .sort((x, y) => y.updated_at - x.updated_at);
        }

        case 'data_dir_size':
          return 4194304;

        case 'check_update':
          return null;

        case 'create_note': {
          const id = nextId++;
          const kind = a.kind === 'mindmap' ? 'mindmap' : 'doc';
          const meta = {
            id,
            kind,
            title: '',
            updated_at: Date.now(),
            renamed: false,
            pinned: false,
            locked: false
          };
          notes.set(id, { ...meta, content: '' });
          return { ...meta };
        }

        case 'save_note': {
          const id = Number(a.id);
          const note = notes.get(id);
          if (note) {
            if (a.content !== undefined) note.content = a.content;
          }
          return null;
        }

        case 'rename_note': {
          const id = Number(a.id);
          const note = notes.get(id);
          if (note) {
            note.title = a.title;
            note.renamed = true;
            note.updated_at = Date.now();
          }
          return a.title;
        }

        case 'set_pinned': {
          const id = Number(a.id);
          const note = notes.get(id);
          if (note) note.pinned = a.pinned;
          return null;
        }

        case 'set_locked': {
          const id = Number(a.id);
          const note = notes.get(id);
          if (note) note.locked = a.locked;
          return null;
        }

        case 'set_session':
          if (Array.isArray(a.open_tabs)) session.open_tabs = a.open_tabs.map(Number);
          if (a.active_tab !== undefined) session.active_tab = Number(a.active_tab);
          return null;

        case 'app_ready':
          return null;

        case 'trash_note':
          notes.delete(Number(a.id));
          return null;

        default:
          return null;
      }
    }
  };
})();
