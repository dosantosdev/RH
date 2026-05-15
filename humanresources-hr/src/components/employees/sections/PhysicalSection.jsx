import './physicalSection.css'

export default function PhysicalSection({ form, handleChange }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Características físicas</h3>

      <div className="physical-grid">
        <select name="bloodType" value={form.bloodType} onChange={handleChange}>
          <option value="">Tipo sanguíneo</option>

          <option value="A+">A+</option>
          <option value="A-">A-</option>

          <option value="B+">B+</option>
          <option value="B-">B-</option>

          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>

          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>

        <input
          name="skinColor"
          value={form.skinColor}
          onChange={handleChange}
          placeholder="Cor da pele"
        />

        <input
          name="hairColor"
          value={form.hairColor}
          onChange={handleChange}
          placeholder="Cor do cabelo"
        />

        <input
          name="eyeColor"
          value={form.eyeColor}
          onChange={handleChange}
          placeholder="Cor dos olhos"
        />

        <input
          name="height"
          value={form.height}
          onChange={handleChange}
          placeholder="Altura"
        />

        <input
          name="weight"
          value={form.weight}
          onChange={handleChange}
          placeholder="Peso"
        />
      </div>
    </div>
  )
}
