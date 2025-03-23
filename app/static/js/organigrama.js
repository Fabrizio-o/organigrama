// Variables globales
let graph;
let paper;
let selectedElement = null;
let connectMode = false;
let sourceNode = null;
let currentOrganigramaId = null;  // ID del organigrama actual

// Colores para los diferentes tipos de nodos
const nodeColors = {
    direct: {
        fill: '#e6f7ff',      // Azul claro para cargos directos
        stroke: '#1890ff'     // Azul para el borde
    },
    advisory: {
        fill: '#fff7e6',      // Amarillo claro para cargos de asesoría
        stroke: '#fa8c16'     // Naranja para el borde
    }
};

// Inicialización cuando el DOM está listo
$(document).ready(function() {
    initializeJointGraph();
    setupEventListeners();
    listOrganigramas();  // Cargar la lista de organigramas al iniciar
});

// Inicializar el gráfico JointJS
function initializeJointGraph() {
    graph = new joint.dia.Graph();
    
    paper = new joint.dia.Paper({
        el: document.getElementById('organigrama'),
        model: graph,
        width: '100%',
        height: 600,
        gridSize: 10,
        drawGrid: true,
        background: {
            color: 'white'
        },
        interactive: {
            vertexAdd: false,
            vertexRemove: false
        }
    });
    
    // Eventos del papel (área de dibujo)
    paper.on('cell:pointerclick', function(cellView, evt, x, y) {
        if (connectMode && cellView.model.isElement()) {
            handleConnectionMode(cellView.model);
        } else {
            selectElement(cellView);
        }
    });
    
    paper.on('blank:pointerclick', function() {
        deselectAll();
    });
    
    // Permitir arrastrar nodos
    paper.on('element:pointerdown', function(elementView, evt) {
        // Solo permitir arrastrar con el botón izquierdo
        if (evt.button === 0) {
            elementView.model.toFront();
        }
    });
}

// Función para crear un nuevo organigrama
function createNewOrganigrama() {
    if (confirm('¿Estás seguro de crear un nuevo organigrama? Se perderán los cambios no guardados.')) {
        // Limpiar el gráfico
        graph.clear();

        // Restablecer el ID del organigrama actual
        currentOrganigramaId = null;

        // Deseleccionar cualquier elemento seleccionado
        deselectAll();

        // Mostrar un mensaje de éxito
        alert('Nuevo organigrama creado. Puedes comenzar a añadir nodos.');
    }
}

// Configurar escuchadores de eventos
function setupEventListeners() {
    // Botón para añadir un nuevo nodo
    $('#btn-add-node').click(function() {
        createNewNode();
    });

    // Botón para crear un nuevo organigrama
    $('#btn-new-organigrama').click(function() {
        createNewOrganigrama();
    });

    // Formulario de propiedades del nodo
    $('#node-form').submit(function(e) {
        e.preventDefault();
        saveNodeChanges();
    });

    // Botón para eliminar nodo
    $('#btn-delete-node').click(function() {
        deleteSelectedNode();
    });

    // Formulario de propiedades de la conexión
    $('#connection-form').submit(function(e) {
        e.preventDefault();
        saveConnectionChanges();
    });

    // Botón para eliminar conexión
    $('#btn-delete-connection').click(function() {
        deleteSelectedConnection();
    });

    // Botón para activar el modo de conexión
    $('#btn-connect-nodes').click(function() {
        openConnectionModal();
    });

    // Botón para crear conexión desde el modal
    $('#btn-create-connection').click(function() {
        createConnectionFromModal();
    });

    // Botón para guardar el organigrama completo
    $('#btn-save-diagram').click(function() {
        openSaveOrganigramaModal();
    });

    // Botón para cargar un organigrama
    $('#btn-load-diagram').click(function() {
        openLoadOrganigramaModal();
    });

    // Botón para imprimir el organigrama
    $('#btn-print-diagram').click(function() {
        printOrganigrama();
    });

    // Botón para guardar el organigrama desde el modal
    $('#btn-save-organigrama').click(function() {
        saveOrganigrama();
    });

    // Botón para cargar un organigrama seleccionado
    $('#btn-load-selected-organigrama').click(function() {
        loadSelectedOrganigrama();
    });
}

// Abrir modal para guardar organigrama
function openSaveOrganigramaModal() {
    const modal = new bootstrap.Modal(document.getElementById('saveOrganigramaModal'));
    modal.show();
}

// Abrir modal para cargar organigrama
function openLoadOrganigramaModal() {
    const modal = new bootstrap.Modal(document.getElementById('loadOrganigramaModal'));
    modal.show();
}

// Guardar organigrama
function saveOrganigrama() {
    const nombre = $('#organigrama-name').val();
    
    if (!nombre) {
        alert('Por favor, asigna un nombre al organigrama.');
        return;
    }
    
    const organigramaData = {
        nombre: nombre,
        nodos: graph.getElements().map(function(node) {
            const nodeData = node.get('nodeData');
            return {
                id: nodeData.id,
                title: nodeData.title,
                description: nodeData.description,
                nodeType: nodeData.nodeType,
                positionX: node.position().x,
                positionY: node.position().y
            };
        }),
        conexiones: graph.getLinks().map(function(link) {
            const connectionData = link.get('connectionData');
            return {
                id: connectionData.id,
                sourceId: connectionData.sourceId,
                targetId: connectionData.targetId,
                connectionType: connectionData.connectionType
            };
        })
    };
    
    $.ajax({
        url: '/api/organigramas',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(organigramaData),
        success: function(organigrama) {
            alert('Organigrama guardado correctamente.');
            const modal = bootstrap.Modal.getInstance(document.getElementById('saveOrganigramaModal'));
            modal.hide();
            listOrganigramas();  // Actualizar la lista de organigramas
        },
        error: function(error) {
            console.error('Error al guardar organigrama:', error);
            alert('Error al guardar el organigrama.');
        }
    });
}

// Listar organigramas guardados
function listOrganigramas() {
    $.ajax({
        url: '/api/organigramas',
        type: 'GET',
        success: function(organigramas) {
            const organigramaList = $('#organigrama-list');
            organigramaList.empty();

            organigramas.forEach(function(organigrama) {
                const item = $('<div class="list-group-item"></div>')
                    .text(organigrama.nombre)
                    .click(function() {
                        // Remover la clase 'active' de todos los elementos
                        organigramaList.find('.list-group-item').removeClass('active');

                        // Agregar la clase 'active' al elemento seleccionado
                        $(this).addClass('active');

                        // Guardar el ID del organigrama seleccionado
                        $('#btn-load-selected-organigrama').data('organigramaId', organigrama.id);
                    });

                organigramaList.append(item);
            });
        },
        error: function(error) {
            console.error('Error al listar organigramas:', error);
            alert('Error al cargar la lista de organigramas.');
        }
    });
}

// Cargar un organigrama seleccionado
function loadSelectedOrganigrama() {
    const organigramaId = $('#btn-load-selected-organigrama').data('organigramaId');
    
    if (!organigramaId) {
        alert('Por favor, selecciona un organigrama para cargar.');
        return;
    }
    
    loadNodesFromServer(organigramaId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('loadOrganigramaModal'));
    modal.hide();
}

// Crear un nuevo nodo
function createNewNode() {
    const defaultPosition = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200
    };
    
    const newNode = {
        title: 'Nuevo cargo',
        description: 'Descripción del cargo',
        nodeType: 'direct',
        positionX: defaultPosition.x,
        positionY: defaultPosition.y,
        organigramaId: currentOrganigramaId  // Asociar el nodo al organigrama actual
    };
    
    $.ajax({
        url: '/api/nodes',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(newNode),
        success: function(createdNode) {
            createNodeShape(createdNode);
            selectNodeById(createdNode.id);
        },
        error: function(error) {
            console.error('Error al crear nodo:', error);
            alert('Error al crear el nuevo nodo.');
        }
    });
}

// Crear la forma visual de un nodo
function createNodeShape(nodeData) {
    // Obtener colores según el tipo de nodo
    const nodeColor = nodeColors[nodeData.nodeType] || nodeColors.direct;
    
    // Crear un nodo rectangular con JointJS
    const rect = new joint.shapes.standard.Rectangle({
        id: 'node-' + nodeData.id,
        position: { x: nodeData.positionX, y: nodeData.positionY },
        size: { width: 150, height: 60 },
        attrs: {
            body: {
                fill: nodeColor.fill,
                stroke: nodeColor.stroke,
                strokeWidth: 2
            },
            label: {
                text: nodeData.title,
                fill: '#333',
                fontSize: 12,
                fontFamily: 'Arial, sans-serif'
            }
        },
        nodeData: nodeData  // Guardar los datos completos del nodo
    });
    
    graph.addCell(rect);
    
    // Permitir actualizar la posición cuando se mueve el nodo
    rect.on('change:position', function() {
        const position = rect.position();
        updateNodePosition(nodeData.id, position.x, position.y);
    });
    
    return rect;
}

// Crear una conexión entre nodos
function createConnectionShape(connectionData) {
    const sourceCell = graph.getCell('node-' + connectionData.sourceId);
    const targetCell = graph.getCell('node-' + connectionData.targetId);
    
    if (!sourceCell || !targetCell) {
        console.error('No se pueden encontrar los nodos para la conexión:', connectionData);
        return null;
    }
    
    // Obtener color para la conexión basado en el tipo
    const strokeColor = connectionData.connectionType === 'advisory' ? '#fa8c16' : '#1890ff';
    
    // Crear una línea para la conexión utilizando JointJS
    const link = new joint.shapes.standard.Link({
        id: 'connection-' + connectionData.id,
        source: { id: sourceCell.id },
        target: { id: targetCell.id },
        router: { name: 'orthogonal' },  // Usar enrutamiento ortogonal (solo líneas horizontales y verticales)
        connector: { name: 'rounded' },
        attrs: {
            line: {
                stroke: strokeColor,
                strokeWidth: 2,
                strokeDasharray: connectionData.connectionType === 'advisory' ? '5,3' : 'none'
            }
        },
        connectionData: connectionData  // Guardar los datos completos de la conexión
    });
    
    graph.addCell(link);
    return link;
}

// Seleccionar un elemento (nodo o conexión)
function selectElement(cellView) {
    deselectAll();
    
    const model = cellView.model;
    selectedElement = model;
    
    // Añadir estilo visual para mostrar que está seleccionado
    if (model.isElement()) {
        // Es un nodo
        model.attr('body/stroke', '#007bff');
        model.attr('body/strokeWidth', 3);
        
        // Mostrar propiedades del nodo
        showNodeProperties(model.get('nodeData'));
    } else if (model.isLink()) {
        // Es una conexión
        model.attr('line/stroke', '#007bff');
        model.attr('line/strokeWidth', 3);
        
        // Mostrar propiedades de la conexión
        showConnectionProperties(model.get('connectionData'));
    }
}

// Mostrar el formulario con las propiedades del nodo
function showNodeProperties(nodeData) {
    $('#connection-form').addClass('d-none');
    $('#node-form').removeClass('d-none');
    
    $('#node-id').val(nodeData.id);
    $('#node-title').val(nodeData.title);
    $('#node-description').val(nodeData.description);
    $('#node-type').val(nodeData.nodeType);
}

// Mostrar el formulario con las propiedades de la conexión
function showConnectionProperties(connectionData) {
    $('#node-form').addClass('d-none');
    $('#connection-form').removeClass('d-none');
    
    $('#connection-id').val(connectionData.id);
    $('#connection-type').val(connectionData.connectionType);
}

// Deseleccionar todos los elementos
function deselectAll() {
    if (selectedElement) {
        if (selectedElement.isElement()) {
            const nodeData = selectedElement.get('nodeData');
            const nodeColor = nodeColors[nodeData.nodeType] || nodeColors.direct;
            selectedElement.attr('body/stroke', nodeColor.stroke);
            selectedElement.attr('body/strokeWidth', 2);
        } else if (selectedElement.isLink()) {
            const connectionData = selectedElement.get('connectionData');
            const strokeColor = connectionData.connectionType === 'advisory' ? '#fa8c16' : '#1890ff';
            selectedElement.attr('line/stroke', strokeColor);
            selectedElement.attr('line/strokeWidth', 2);
        }
    }
    
    selectedElement = null;
    $('#node-form').addClass('d-none');
    $('#connection-form').addClass('d-none');
}

// Guardar cambios en un nodo
function saveNodeChanges() {
    const nodeId = $('#node-id').val();
    
    const updatedNode = {
        title: $('#node-title').val(),
        description: $('#node-description').val(),
        nodeType: $('#node-type').val()
    };
    
    $.ajax({
        url: '/api/nodes/' + nodeId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedNode),
        success: function(node) {
            // Actualizar la visualización del nodo
            updateNodeVisual(node);
            alert('Nodo actualizado correctamente.');
        },
        error: function(error) {
            console.error('Error al actualizar nodo:', error);
            alert('Error al actualizar el nodo.');
        }
    });
}

// Actualizar la visualización de un nodo
function updateNodeVisual(nodeData) {
    const cell = graph.getCell('node-' + nodeData.id);
    
    if (cell) {
        // Obtener colores según el tipo de nodo
        const nodeColor = nodeColors[nodeData.nodeType] || nodeColors.direct;
        
        cell.attr('label/text', nodeData.title);
        cell.attr('body/fill', nodeColor.fill);
        cell.attr('body/stroke', nodeColor.stroke);
        cell.set('nodeData', nodeData);
    }
}

// Guardar cambios en una conexión
function saveConnectionChanges() {
    const connectionId = $('#connection-id').val();
    
    const updatedConnection = {
        connectionType: $('#connection-type').val()
    };
    
    $.ajax({
        url: '/api/connections/' + connectionId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedConnection),
        success: function(connection) {
            // Actualizar la visualización de la conexión
            updateConnectionVisual(connection);
            alert('Conexión actualizada correctamente.');
        },
        error: function(error) {
            console.error('Error al actualizar conexión:', error);
            alert('Error al actualizar la conexión.');
        }
    });
}

// Actualizar la visualización de una conexión
function updateConnectionVisual(connectionData) {
    const cell = graph.getCell('connection-' + connectionData.id);
    
    if (cell) {
        // Obtener color para la conexión basado en el tipo
        const strokeColor = connectionData.connectionType === 'advisory' ? '#fa8c16' : '#1890ff';
        
        cell.attr('line/stroke', strokeColor);
        cell.attr('line/strokeDasharray', connectionData.connectionType === 'advisory' ? '5,3' : 'none');
        cell.set('connectionData', connectionData);
    }
}

// Eliminar el nodo seleccionado
function deleteSelectedNode() {
    if (!selectedElement || !selectedElement.isElement()) {
        return;
    }

    const nodeData = selectedElement.get('nodeData');

    if (confirm('¿Estás seguro de eliminar este nodo? Se eliminarán también todas sus conexiones.')) {
        $.ajax({
            url: '/api/nodes/' + nodeData.id,
            type: 'DELETE',
            success: function() {
                // Eliminar las conexiones asociadas al nodo
                const connections = graph.getConnectedLinks(selectedElement);
                graph.removeCells(connections);

                // Eliminar el nodo del gráfico
                graph.removeCells(selectedElement);

                // Deseleccionar el nodo y ocultar el formulario de propiedades
                deselectAll();

                // Mostrar un mensaje de éxito
                alert('Nodo eliminado correctamente.');
            },
            error: function(error) {
                console.error('Error al eliminar nodo:', error);
                alert('Error al eliminar el nodo.');
            }
        });
    }
}

// Eliminar la conexión seleccionada
function deleteSelectedConnection() {
    if (!selectedElement || !selectedElement.isLink()) {
        return;
    }
    
    const connectionData = selectedElement.get('connectionData');
    
    if (confirm('¿Estás seguro de eliminar esta conexión?')) {
        $.ajax({
            url: '/api/connections/' + connectionData.id,
            type: 'DELETE',
            success: function() {
                graph.removeCells(selectedElement);
                deselectAll();
                alert('Conexión eliminada correctamente.');
            },
            error: function(error) {
                console.error('Error al eliminar conexión:', error);
                alert('Error al eliminar la conexión.');
            }
        });
    }
}

// Actualizar posición de un nodo en el servidor
function updateNodePosition(nodeId, x, y) {
    const updatedPosition = {
        positionX: x,
        positionY: y
    };
    
    $.ajax({
        url: '/api/nodes/' + nodeId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedPosition),
        error: function(error) {
            console.error('Error al actualizar posición:', error);
        }
    });
}

// Seleccionar un nodo por su ID
function selectNodeById(nodeId) {
    const cellView = paper.findViewByModel(graph.getCell('node-' + nodeId));
    
    if (cellView) {
        selectElement(cellView);
    }
}

// Abrir modal para crear conexiones
function openConnectionModal() {
    // Cargar los nodos disponibles en los selects
    $('#source-node').empty();
    $('#target-node').empty();
    
    const nodes = graph.getElements();
    
    nodes.forEach(function(node) {
        const nodeData = node.get('nodeData');
        const option = $('<option></option>')
            .val(nodeData.id)
            .text(nodeData.title);
        
        $('#source-node').append(option.clone());
        $('#target-node').append(option);
    });
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('connectionModal'));
    modal.show();
}

// Crear una conexión desde el modal
function createConnectionFromModal() {
    const sourceId = $('#source-node').val();
    const targetId = $('#target-node').val();
    const connectionType = $('#new-connection-type').val();
    
    if (sourceId === targetId) {
        alert('No se puede conectar un nodo consigo mismo.');
        return;
    }
    
    const newConnection = {
        sourceId: sourceId,
        targetId: targetId,
        connectionType: connectionType
    };
    
    $.ajax({
        url: '/api/connections',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(newConnection),
        success: function(createdConnection) {
            createConnectionShape(createdConnection);
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('connectionModal'));
            modal.hide();
            
            alert('Conexión creada correctamente.');
        },
        error: function(error) {
            console.error('Error al crear conexión:', error);
            alert('Error al crear la conexión.');
        }
    });
}

// Función para imprimir el organigrama
function printOrganigrama() {
    const organigrama = document.getElementById('organigrama');

    if (!organigrama) {
        alert('No se encontró el organigrama para imprimir.');
        return;
    }

    // Crear una ventana emergente para imprimir solo el organigrama
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>ORGANIGRAMA</title>
                <style>
                    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
                    #organigrama { width: 100%; height: auto; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                ${organigrama.outerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
}