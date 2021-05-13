const statusLabelElement = document.getElementById('status-label')

const refreshStatus = () => {
    fetch('/api/config', { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(res => {
            if (res.requests.status === 'open') {
                statusLabelElement.textContent = 'Open'
            } else {
                statusLabelElement.textContent = 'Closed'
            }
        })
}

function openQueue() {
    fetch('/admin/api/status?action=open', { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(res => {
            if (res.error) {
                return toast('Error: Could not change status: ' + res.error)
            }
            refreshStatus()
            toast('Opened the queue')
        })
}

async function closeQueue() {
    fetch('/admin/api/status?action=close', { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(res => {
            if (res.error) {
                return toast('Error: Could not change status: ' + res.error)
            }
            refreshStatus()
            toast('Closed the queue')
        })
}

refreshStatus()
