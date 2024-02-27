import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import { fetchConnectedInstanceAction } from 'uiSrc/slices/rdi/instances'
import { fetchRdiPipeline, rdiPipelineSelector } from 'uiSrc/slices/rdi/pipeline'
import { fetchRdiStatistics, rdiStatisticsSelector } from 'uiSrc/slices/rdi/statistics'
import Clients from './clients'
import DataStreams from './data-streams'
import Empty from './empty'
import RdiStatisticsHeader from './header'
import ProcessingPerformance from './processing-performance'
import Status from './status'
import TargetConnections from './target-connections'

import styles from './styles.module.scss'

const StatisticsPage = () => {
  const { rdiInstanceId } = useParams<{ rdiInstanceId: string }>()

  const dispatch = useDispatch()

  const { loading, data: pipelineData } = useSelector(rdiPipelineSelector)
  const { data: statisticsData } = useSelector(rdiStatisticsSelector)
  
  console.log(statisticsData)

  useEffect(() => {
    dispatch(fetchConnectedInstanceAction(rdiInstanceId))
    dispatch(fetchRdiPipeline(rdiInstanceId))
    dispatch(fetchRdiStatistics(rdiInstanceId))
  }, [])

  return (
    <div className={styles.pageContainer}>
      <RdiStatisticsHeader loading={loading} />
      <div className={styles.bodyContainer}>
        {!pipelineData ? (
          <Empty rdiInstanceId={rdiInstanceId} />
        ) : (
          <>
            <Status />
            <ProcessingPerformance />
            <TargetConnections />
            <DataStreams />
            <Clients />
          </>
        )}
      </div>
    </div>
  )
}

export default StatisticsPage
