
import React from 'react'
import { HistoryList } from './_components/history-list'

const page =  () => {
    
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">All History</h1>
      <HistoryList />
    </div>
  )
}

export default page
