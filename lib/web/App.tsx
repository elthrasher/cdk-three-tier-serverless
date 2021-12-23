import React, { useEffect, useState } from 'react';

import { NoteType } from '../fns/notesTable';
import { getNotes, saveNote } from './utils';

// Best practice would be to break this component down and maybe do a bit more with state management.
const App = () => {
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState([]);
  const [subject, setSubject] = useState('');

  useEffect(() => {
    getNotes().then((n) => setNotes(n));
  }, []);

  const clickHandler = async () => {
    if (body && subject) {
      setBody('');
      setSubject('');
      await saveNote({
        date: new Date().toISOString(),
        note: body,
        subject,
        type: 'note',
      });
      const n = await getNotes();
      setNotes(n);
    }
  };

  return (
    <div>
      <div>
        <div>
          <input
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Note Subject"
            type="text"
            value={subject}
          />
        </div>
        <div>
          <textarea
            onChange={(e) => setBody(e.target.value)}
            placeholder="Note Body"
            value={body}
          ></textarea>
        </div>
        <div>
          <button onClick={clickHandler}>save</button>
        </div>
      </div>
      <div>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Note</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note: NoteType) => (
              <tr key={note.date}>
                <td>{note.subject}</td>
                <td>{note.note}</td>
                <td>{new Date(note.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;
