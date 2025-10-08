import 'react'
import { useState, useEffect, use } from 'react'
import { MCQChallenge } from '../challenge/MCQChallenge.jsx'

export function HistoryPanel() {
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchHistory();
    }, [])

    const fetchHistory = async () => {
        setIsLoading(false);
    }

    if (isLoading) {
        return <div className='loading'>Loading history...</div>
    }

    if (error) {
        return <div className='error-message'>
            <p>{error}</p>
            <button onClick={fetchHistory}>Retry</button>
        </div>
    }

    return <div className='history-panel'>
        <h2>History</h2>
        {history.length === 0 ?
            <p>No Challenge History</p>
            :
            <div className='history-list'>
                {history.map((challenge) => {
                    return <MCQChallenge
                        challenge={challenge}
                        key={challenge.id}
                        showExplanation/>
                })}
            </div>
        }
    </div>
}