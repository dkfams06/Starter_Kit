import { LoadingState } from "@/components/crud/async-state";

export default function AdminLoading() {
  return <LoadingState description="잠시만 기다려 주세요." title="화면을 불러오는 중입니다." />;
}
