import { useState } from 'react'

export default function TrainingContent({ training, onClose, onUpdate }) {
  const initialContent = {
    title: '',
    type: 'text',
    content: '',
    order: training.contents?.length + 1 || 1
  }

  const [content, setContent] = useState(initialContent)
  const [selectedContent, setSelectedContent] = useState(null)
  const [editingContent, setEditingContent] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target

    setContent((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  function handleAddContent(e) {
    e.preventDefault()

    if (!content.title.trim()) {
      alert('Informe o título do conteúdo.')
      return
    }

    if (!content.content.trim()) {
      alert('Informe o conteúdo.')
      return
    }

    const newContent = {
      ...content,
      id: Date.now(),
      order: training.contents?.length + 1 || 1
    }

    const updatedTraining = {
      ...training,
      contents: [...(training.contents || []), newContent]
    }

    onUpdate(updatedTraining)

    setContent({
      ...initialContent,
      order: updatedTraining.contents.length + 1
    })
  }

  function handleEditContent(item) {
    setEditingContent(item)

    setContent({
      title: item.title,
      type: item.type,
      content: item.content,
      order: item.order
    })

    setSelectedContent(null)
  }

  function handleUpdateContent(e) {
    e.preventDefault()

    if (!content.title.trim()) {
      alert('Informe o título do conteúdo.')
      return
    }

    if (!content.content.trim()) {
      alert('Informe o conteúdo.')
      return
    }

    const updatedContents = training.contents.map((item) =>
      item.id === editingContent.id
        ? {
            ...item,
            title: content.title,
            type: content.type,
            content: content.content
          }
        : item
    )

    onUpdate({
      ...training,
      contents: updatedContents
    })

    setEditingContent(null)

    setContent({
      ...initialContent,
      order: updatedContents.length + 1
    })
  }

  function handleCancelEdit() {
    setEditingContent(null)

    setContent({
      ...initialContent,
      order: training.contents?.length + 1 || 1
    })
  }

  function handleDeleteContent(contentId) {
    const updatedContents = (training.contents || [])
      .filter((item) => item.id !== contentId)
      .map((item, index) => ({
        ...item,
        order: index + 1
      }))

    onUpdate({
      ...training,
      contents: updatedContents
    })

    if (selectedContent?.id === contentId) {
      setSelectedContent(null)
    }

    if (editingContent?.id === contentId) {
      setEditingContent(null)
      setContent({
        ...initialContent,
        order: updatedContents.length + 1
      })
    }
  }

  function moveContent(contentId, direction) {
    const contents = [...(training.contents || [])]

    const currentIndex = contents.findIndex((item) => item.id === contentId)

    if (currentIndex === -1) {
      return
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= contents.length) {
      return
    }

    const [movedContent] = contents.splice(currentIndex, 1)

    contents.splice(newIndex, 0, movedContent)

    const updatedContents = contents.map((item, index) => ({
      ...item,
      order: index + 1
    }))

    onUpdate({
      ...training,
      contents: updatedContents
    })
  }

  function getTypeLabel(type) {
    const labels = {
      text: 'Texto',
      video: 'Vídeo',
      pdf: 'PDF'
    }

    return labels[type] || type
  }

  function handleViewContent(item) {
    setSelectedContent(item)
  }

  function renderContentPreview(item) {
    if (item.type === 'text') {
      return <div className="training-content-text-preview">{item.content}</div>
    }

    if (item.type === 'video') {
      return (
        <div className="training-content-video-preview">
          <iframe
            src={item.content}
            title={item.title}
            width="100%"
            height="450"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }

    if (item.type === 'pdf') {
      return (
        <div className="training-content-pdf-preview">
          <iframe
            src={item.content}
            title={item.title}
            width="100%"
            height="600"
          />

          <a
            href={item.content}
            target="_blank"
            rel="noreferrer"
            className="training-pdf-link"
          >
            Abrir PDF em nova aba
          </a>
        </div>
      )
    }

    return <p>Tipo de conteúdo não suportado.</p>
  }

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal">
        {/* CABEÇALHO */}

        <div className="training-modal-header">
          <div>
            <h2>Conteúdos do treinamento</h2>

            <p>{training.name}</p>
          </div>

          <button
            type="button"
            className="training-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* CONTEÚDO */}

        <div className="training-content-body">
          {/* LISTA DE CONTEÚDOS */}

          <div className="training-content-list">
            <div className="training-content-section-header">
              <div>
                <h3>Conteúdos cadastrados</h3>

                <span>{training.contents?.length || 0} conteúdo(s)</span>
              </div>
            </div>

            {training.contents?.length > 0 ? (
              <div className="training-content-items">
                {[...training.contents]
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                    <div key={item.id} className="training-content-item">
                      {/* ORDEM */}

                      <div className="training-content-number">
                        {item.order}
                      </div>

                      {/* INFORMAÇÕES */}

                      <div
                        className="training-content-info"
                        onClick={() => handleViewContent(item)}
                      >
                        <strong>{item.title}</strong>

                        <span>{getTypeLabel(item.type)}</span>
                      </div>

                      {/* MOVER */}

                      <div className="training-content-move">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveContent(item.id, 'up')}
                          title="Mover para cima"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          disabled={index === training.contents.length - 1}
                          onClick={() => moveContent(item.id, 'down')}
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                      </div>

                      {/* AÇÕES */}

                      <div className="training-content-actions">
                        <button
                          type="button"
                          onClick={() => handleViewContent(item)}
                          title="Visualizar conteúdo"
                        >
                          👁️
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditContent(item)}
                          title="Editar conteúdo"
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteContent(item.id)}
                          title="Excluir conteúdo"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="training-content-empty">
                <span>📄</span>

                <p>Nenhum conteúdo cadastrado.</p>
              </div>
            )}
          </div>

          {/* VISUALIZAÇÃO */}

          {selectedContent && (
            <div className="training-content-viewer">
              <div className="training-content-viewer-header">
                <div>
                  <span>{getTypeLabel(selectedContent.type)}</span>

                  <h3>{selectedContent.title}</h3>
                </div>

                <button type="button" onClick={() => setSelectedContent(null)}>
                  Fechar visualização
                </button>
              </div>

              <div className="training-content-viewer-body">
                {renderContentPreview(selectedContent)}
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE CONTEÚDO */}

          <form
            className="training-new-content"
            onSubmit={editingContent ? handleUpdateContent : handleAddContent}
          >
            <h3>{editingContent ? 'Editar conteúdo' : 'Adicionar conteúdo'}</h3>

            <div className="training-content-form-grid">
              {/* TÍTULO */}

              <div className="training-field full">
                <label>Título *</label>

                <input
                  type="text"
                  name="title"
                  value={content.title}
                  onChange={handleChange}
                  placeholder="Ex.: Introdução à segurança"
                />
              </div>

              {/* TIPO */}

              <div className="training-field">
                <label>Tipo de conteúdo</label>

                <select
                  name="type"
                  value={content.type}
                  onChange={handleChange}
                >
                  <option value="text">Texto</option>

                  <option value="video">Vídeo</option>

                  <option value="pdf">PDF</option>
                </select>
              </div>

              {/* ORDEM */}

              <div className="training-field">
                <label>Ordem</label>

                <input type="number" value={content.order} disabled />
              </div>

              {/* CONTEÚDO */}

              <div className="training-field full">
                <label>
                  {content.type === 'text'
                    ? 'Texto do conteúdo *'
                    : content.type === 'video'
                      ? 'URL do vídeo *'
                      : 'URL do PDF *'}
                </label>

                {content.type === 'text' ? (
                  <textarea
                    name="content"
                    value={content.content}
                    onChange={handleChange}
                    rows="7"
                    placeholder="Digite o conteúdo do treinamento..."
                  />
                ) : (
                  <input
                    type="url"
                    name="content"
                    value={content.content}
                    onChange={handleChange}
                    placeholder={
                      content.type === 'video'
                        ? 'https://www.youtube.com/embed/...'
                        : 'https://...'
                    }
                  />
                )}
              </div>
            </div>

            <div className="training-content-form-actions">
              {editingContent && (
                <button
                  type="button"
                  className="training-secondary-button"
                  onClick={handleCancelEdit}
                >
                  Cancelar edição
                </button>
              )}

              <button type="submit" className="training-primary-button">
                {editingContent ? 'Salvar alterações' : '+ Adicionar conteúdo'}
              </button>
            </div>
          </form>
        </div>

        {/* RODAPÉ */}

        <div className="training-modal-footer">
          <button
            type="button"
            className="training-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
