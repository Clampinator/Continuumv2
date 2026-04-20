
import React, { useState } from 'react';

// TypeScript interfaces for the data structure
interface PersonalData {
  name: string;
  pronouns: string;
  heritage: string;
  height: string;
  weight: string;
  age: {
    years: string;
    days: string;
  };
  dob: string;
  locality: string;
  society: string;
  grace: string;
  invitationDate: string;
  corner: string;
  fraternity: string;
  era: string;
}

interface Props {
  data: PersonalData;
  onUpdate: (field: string, value: string) => void;
}

const FloatingPersonalPanel: React.FC<Props> = ({ data, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Strip "system.personal." prefix to make it cleaner for the handler
    const cleanName = name.replace('system.personal.', '');
    onUpdate(cleanName, value);
  };

  return (
    <>
      {/* Backdrop to close panel when clicking outside */}
      <div 
        className={`floating-panel-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(false)}
      />

      <div className={`floating-panel-container ${isOpen ? 'open' : ''}`}>
        
        {/* The Content Panel (Copied structure from personal.html) */}
        <div className="floating-panel-content continuum">
          <div className="section-header-row">
            <h2 className="section-heading">Personal Information</h2>
          </div>

          <div className="columns">
            {/* Description Column */}
            <div className="column">
              <h3>Description</h3>
              <div className="form-row">
                <label htmlFor="fp-name">Name:</label>
                <input type="text" id="fp-name" name="system.personal.name" value={data.name} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-pronouns">Identity:</label>
                <input type="text" id="fp-pronouns" name="system.personal.pronouns" value={data.pronouns} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-heritage">Heritage:</label>
                <input type="text" id="fp-heritage" name="system.personal.heritage" value={data.heritage} onChange={handleChange} />
              </div>
              <div className="form-row-double">
                <div className="form-subrow">
                  <label htmlFor="fp-height">Height:</label>
                  <input type="text" id="fp-height" name="system.personal.height" value={data.height} onChange={handleChange} />
                  <span className="static-text">cm.</span>
                </div>
                <div className="form-subrow">
                  <label>Age:</label>
                  <div className="form-subrow-pair">
                    <input type="text" name="system.personal.age.years" value={data.age.years} onChange={handleChange} />
                    <span className="static-text">Years</span>
                  </div>
                </div>
              </div>
              <div className="form-row-double">
                <div className="form-subrow">
                  <label htmlFor="fp-weight">Weight:</label>
                  <input type="text" id="fp-weight" name="system.personal.weight" value={data.weight} onChange={handleChange} />
                  <span className="static-text">kg.</span>
                </div>
                <div className="form-subrow">
                  <label>Days:</label>
                  <input type="text" name="system.personal.age.days" value={data.age.days} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Locality Column */}
            <div className="column">
              <h3>Locality</h3>
              <div className="form-row">
                <label htmlFor="fp-dob">Date of Birth:</label>
                <input type="date" id="fp-dob" name="system.personal.dob" value={data.dob} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-locality">Locality:</label>
                <input type="text" id="fp-locality" name="system.personal.locality" value={data.locality} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-society">Society:</label>
                <input type="text" id="fp-society" name="system.personal.society" value={data.society} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-grace">Grace:</label>
                <input type="text" id="fp-grace" name="system.personal.grace" value={data.grace} onChange={handleChange} />
              </div>
            </div>

            {/* Continuum Column */}
            <div className="column">
              <h3>Continuum</h3>
              <div className="form-row">
                <label htmlFor="fp-date-invitation">Date of Invitation:</label>
                <input type="date" id="fp-date-invitation" name="system.personal.invitationDate" value={data.invitationDate} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-corner">Corner:</label>
                <input type="text" id="fp-corner" name="system.personal.corner" value={data.corner} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="fp-fraternity">Fraternity:</label>
                <select id="fp-fraternity" name="system.personal.fraternity" value={data.fraternity} onChange={handleChange}>
                  <option value="">None</option>
                  <option value="Antequarians">Antequarians</option>
                  <option value="Engineers">Engineers</option>
                  <option value="Foxhorn">Foxhorn</option>
                  <option value="Midwives">Midwives</option>
                  <option value="Moneychangers">Moneychangers</option>
                  <option value="Physicians">Physicians</option>
                  <option value="Quicker">Quicker</option>
                  <option value="Scribes">Scribes</option>
                  <option value="Thesbians">Thesbians</option>
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="fp-era">Era:</label>
                <select id="fp-era" name="system.personal.era" value={data.era} onChange={handleChange}>
                  <option value="" disabled>Select...</option>
                  <option value="Aquarian">Aquarian</option>
                  <option value="Piscean">Piscean</option>
                  <option value="Ariesian">Ariesian</option>
                  <option value="Tauran">Tauran</option>
                  <option value="Geminid">Geminid</option>
                  <option value="Cancerean">Cancerean</option>
                  <option value="Leonid">Leonid</option>
                  <option value="Virgin">Virgin</option>
                  <option value="Libran">Libran</option>
                  <option value="Scorpiod">Scorpiod</option>
                  <option value="Sagittarian">Sagittarian</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* The Tab Button */}
        <button 
          className="floating-panel-trigger" 
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close Personal Information" : "Open Personal Information"}
          title="Click to view Personal Information"
        >
          Personal Information
        </button>
      </div>
    </>
  );
};

export default FloatingPersonalPanel;
