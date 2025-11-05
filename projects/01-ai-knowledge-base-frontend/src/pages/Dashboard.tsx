import { Card, Row, Col, Statistic } from 'antd'
import { FileTextOutlined, DatabaseOutlined, SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons'

export const Dashboard: React.FC = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>工作台</h1>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="知识库"
              value={5}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="文档总数"
              value={128}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日搜索"
              value={45}
              prefix={<SearchOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="提问次数"
              value={32}
              prefix={<QuestionCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近活动" style={{ marginTop: 24 }}>
        <p>暂无活动记录</p>
      </Card>
    </div>
  )
}
